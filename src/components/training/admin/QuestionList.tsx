import React from 'react';
import { Pencil, Trash } from 'lucide-react';
import type { TrainingQuestion } from '../../../types/training';

interface QuestionListProps {
  questions: TrainingQuestion[];
  onEdit: (question: TrainingQuestion) => void;
  onDelete: (questionId: string) => void;
}

const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <div key={question.id} className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-slate-900">
                {index + 1}. {question.question}
              </p>
              <div className="mt-2 space-y-1">
                {question.choices.map((choice, i) => (
                  <p
                    key={i}
                    className={`text-sm ${
                      i === question.correctAnswer
                        ? 'text-emerald-600 font-medium'
                        : 'text-slate-600'
                    }`}
                  >
                    {i === question.correctAnswer ? '✓' : '○'} {choice}
                  </p>
                ))}
              </div>
              {question.explanation && (
                <p className="mt-2 text-sm text-slate-500">
                  <span className="font-medium">Explication:</span> {question.explanation}
                </p>
              )}
              <p className="mt-2 text-sm text-slate-500">
                Points: {question.points}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(question)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Modifier"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(question.id)}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuestionList;