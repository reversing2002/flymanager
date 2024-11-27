import { useState, useEffect, useRef } from 'react';
import { DocumentCategory } from '../../types/documentation';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';

interface CategoryTreeProps {
  categories: DocumentCategory[];
  selectedCategory: string | null;
  onSelectCategory: (category_id: string | null) => void;
  isLoading?: boolean;
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

    // Sinon, on sélectionne la catégorie
    onSelectCategory(node.id);
  };

  const renderCategory = (node: CategoryNode, level: number = 0) => {
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedCategory === node.id;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id}>
        <button
          onClick={(e) => handleCategoryClick(node, e)}
          className={`
            w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm
            ${isSelected ? 'bg-sky-50 text-sky-600' : 'hover:bg-slate-50'}
          `}
          style={{ paddingLeft: `${level * 1.5}rem` }}
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
      <button
        onClick={() => {
          onSelectCategory(null);
          setExpanded(new Set());
        }}
        className={`
          w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm
          ${!selectedCategory ? 'bg-sky-50 text-sky-600' : 'hover:bg-slate-50'}
        `}
      >
        <Folder className="h-4 w-4" />
        <span>Tous les documents</span>
      </button>
      {tree
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(node => renderCategory(node))}
    </div>
  );
};

export default CategoryTree;
