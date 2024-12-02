import { useState } from 'react';
import { DocumentCategory } from '../../types/documentation';
import { createCategory, updateCategory } from '../../services/documentService';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext'; // Importation du hook d'authentification
import { hasAnyGroup } from "../../lib/permissions";

interface CategoryModalProps {
  categories: DocumentCategory[];
  clubId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialValues?: {
    name?: string;
    parent_id?: string;
  };
  mode?: 'create' | 'edit';
  categoryId?: string;
}

interface CategoryNode {
  id: string;
  name: string;
  level: number;
  children: CategoryNode[];
}

const buildCategoryTree = (categories: DocumentCategory[], excludeId?: string): CategoryNode[] => {
  const categoryMap = new Map<string, CategoryNode>();
  const rootNodes: CategoryNode[] = [];

  // Créer les nœuds
  categories
    .filter(category => category.id !== excludeId) // Exclure la catégorie en cours d'édition
    .forEach(category => {
      categoryMap.set(category.id, {
        id: category.id,
        name: category.name,
        level: 0,
        children: [],
      });
    });

  // Construire l'arborescence
  categories
    .filter(category => category.id !== excludeId)
    .forEach(category => {
      const node = categoryMap.get(category.id);
      if (node) {
        if (category.parent_id) {
          const parent = categoryMap.get(category.parent_id);
          if (parent) {
            parent.children.push(node);
            node.level = parent.level + 1;
          }
        } else {
          rootNodes.push(node);
        }
      }
    });

  return rootNodes;
};

const flattenCategoryTree = (nodes: CategoryNode[]): CategoryNode[] => {
  const result: CategoryNode[] = [];
  
  const traverse = (node: CategoryNode) => {
    result.push(node);
    node.children
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(traverse);
  };
  
  nodes
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(traverse);
  
  return result;
};

const CategoryModal: React.FC<CategoryModalProps> = ({
  categories,
  clubId,
  onClose,
  onSuccess,
  initialValues = {},
  mode = 'create',
  categoryId,
}) => {
  const { user } = useAuth();
  
  // Vérification de sécurité
  if (!user || !hasAnyGroup(user, ['ADMIN'])) {
    onClose();
    return null;
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: initialValues.name || '',
    parent_id: initialValues.parent_id || '',
  });

  const title = mode === 'create' ? 'Nouvelle catégorie' : 'Modifier la catégorie';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      if (mode === 'create') {
        await createCategory({
          name: formData.name,
          parent_id: formData.parent_id || undefined,
          club_id: clubId,
        });
      } else {
        await updateCategory({
          id: categoryId!,
          name: formData.name,
          parent_id: formData.parent_id || undefined,
          club_id: clubId,
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error creating category:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Construire l'arborescence des catégories
  const tree = buildCategoryTree(categories, categoryId);
  const flatCategories = flattenCategoryTree(tree);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Catégorie parente
            </label>
            <select
              value={formData.parent_id}
              onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Aucune (catégorie racine)</option>
              {flatCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {'  '.repeat(category.level)}
                  {category.level > 0 ? '└ ' : ''}
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'create' ? 'Création...' : 'Modification...'}
                </>
              ) : (
                mode === 'create' ? 'Créer' : 'Modifier'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
