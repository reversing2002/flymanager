import { useState, useEffect, useRef } from 'react';
import { DocumentCategory } from '../../types/documentation';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Edit2, Trash2 } from 'lucide-react';

interface CategoryTreeProps {
  categories: DocumentCategory[];
  selectedCategory: string | null;
  onSelectCategory: (category_id: string | null) => void;
  isLoading?: boolean;
  onCreateCategory?: (parentId?: string) => void;
  onEditCategory?: (category: CategoryNode) => void;
  onDeleteCategory?: (category: CategoryNode) => void;
}

interface CategoryNode {
  id: string;
  name: string;
  children: CategoryNode[];
}

const buildCategoryTree = (categories: DocumentCategory[]): CategoryNode[] => {
  const categoryMap = new Map<string, CategoryNode>();
  const rootNodes: CategoryNode[] = [];

  // Create nodes
  categories.forEach(category => {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      children: [],
    });
  });

  // Build tree structure
  categories.forEach(category => {
    const node = categoryMap.get(category.id)!;
    if (category.parent_id) {
      const parent = categoryMap.get(category.parent_id);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  });

  return rootNodes;
};

const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading = false,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const treeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (treeRef.current && !treeRef.current.contains(event.target as Node)) {
        setExpanded(new Set());
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleExpanded = (category_id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(category_id)) {
      newExpanded.delete(category_id);
    } else {
      newExpanded.add(category_id);
    }
    setExpanded(newExpanded);
  };

  const handleCategoryClick = (node: CategoryNode, event: React.MouseEvent) => {
    // Si on clique sur l'icône de dépliage, on gère uniquement l'expansion
    const isExpandIcon = (event.target as HTMLElement).closest('.expand-icon');
    if (isExpandIcon) {
      event.stopPropagation();
      toggleExpanded(node.id);
      return;
    }

    // Si on clique sur les boutons d'action, ne pas sélectionner la catégorie
    const isActionButton = (event.target as HTMLElement).closest('.action-button');
    if (isActionButton) {
      event.stopPropagation();
      return;
    }

    // Sinon, on sélectionne la catégorie
    onSelectCategory(node.id);
  };

  const renderCategory = (node: CategoryNode, level: number = 0) => {
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedCategory === node.id;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={`
            group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm
            ${isSelected ? 'bg-sky-50 text-sky-600' : 'hover:bg-slate-50'}
          `}
          style={{ paddingLeft: `${level * 1.5}rem` }}
        >
          <button
            onClick={(e) => handleCategoryClick(node, e)}
            className="flex-1 flex items-center gap-2"
          >
            {hasChildren ? (
              <span className="flex-shrink-0 expand-icon">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>
            ) : (
              <span className="w-4" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-sky-500" />
            ) : (
              <Folder className="h-4 w-4 text-slate-400" />
            )}
            <span className="truncate">{node.name}</span>
          </button>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onCreateCategory && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateCategory(node.id);
                }}
                className="action-button p-1 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-sky-50"
                title="Créer une sous-catégorie"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
            {onEditCategory && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCategory(node);
                }}
                className="action-button p-1 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-sky-50"
                title="Modifier la catégorie"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
            {onDeleteCategory && node.name !== 'Non classé' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Les documents seront déplacés vers "Non classé".')) {
                    onDeleteCategory(node);
                  }
                }}
                className="action-button p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                title="Supprimer la catégorie"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {isExpanded &&
          node.children
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(child => renderCategory(child, level + 1))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
      </div>
    );
  }

  const tree = buildCategoryTree(categories);

  return (
    <div ref={treeRef} className="space-y-1">
      <div className="flex items-center justify-between px-2 py-1.5 group">
        <button
          onClick={() => {
            onSelectCategory(null);
            setExpanded(new Set());
          }}
          className={`
            flex-1 flex items-center gap-2 rounded-lg text-sm
            ${!selectedCategory ? 'text-sky-600' : ''}
          `}
        >
          <Folder className="h-4 w-4" />
          <span>Tous les documents</span>
        </button>

        {onCreateCategory && (
          <button
            onClick={() => onCreateCategory()}
            className="action-button p-1 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-sky-50 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Créer une catégorie racine"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {tree
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(node => renderCategory(node))}
    </div>
  );
};

export default CategoryTree;
