import { ChevronRight } from 'lucide-react';
import { DocumentCategory } from '../../types/documentation';

interface BreadcrumbProps {
  categories: DocumentCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  if (!selectedCategory) return null;

  // Construire le chemin de la catégorie sélectionnée
  const buildPath = (categoryId: string): DocumentCategory[] => {
    const path: DocumentCategory[] = [];
    let currentCategory = categories.find(c => c.id === categoryId);
    
    while (currentCategory) {
      path.unshift(currentCategory);
      currentCategory = categories.find(c => c.id === currentCategory?.parent_id);
    }
    
    return path;
  };

  const path = buildPath(selectedCategory);

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={() => onSelectCategory(null)}
        className="text-slate-600 hover:text-slate-900"
      >
        Documents
      </button>
      {path.map((category, index) => (
        <div key={category.id} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <button
            onClick={() => onSelectCategory(category.id)}
            className={`${
              index === path.length - 1
                ? 'text-sky-600 font-medium'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {category.name}
          </button>
        </div>
      ))}
    </div>
  );
};

export default Breadcrumb;
