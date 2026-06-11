import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatDateTime } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, Circle, Clock, Trash2, User } from 'lucide-react';
import TaskForm from './TaskForm';

export default function Tasks() {
  const { data, updateTask, deleteTask, currentUser, addActivityLog } = useCRM();
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('todo');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const filteredTasks = (data.tasks || [])
    .filter(t => {
      // Filter by completion status
      if (filter === 'todo' && t.completed) return false;
      if (filter === 'done' && !t.completed) return false;
      
      // Filter by user
      if (!isAdmin) {
        // Employee only sees their own tasks
        if (t.assigneeId !== currentUser?.id) return false;
      } else {
        // Admin can filter by employee
        if (employeeFilter !== 'all' && t.assigneeId !== employeeFilter) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (a.completed === b.completed) {
        // Sort by dueDate if available
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.completed ? 1 : -1;
    });

  const toggleTask = (id: string, completed: boolean) => {
    updateTask(id, { 
      completed: !completed,
      completedAt: !completed ? new Date().toISOString() : undefined
    });
    
    if (!completed && currentUser) {
      const task = data.tasks.find(t => t.id === id);
      if (task) {
        addActivityLog({
          type: 'task_completed',
          title: 'Tâche terminée',
          description: `a terminé la tâche "${task.title}"`,
          userId: currentUser.id
        });
      }
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tâches & Rappels</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filteredTasks.filter(t => !t.completed).length} tâche(s) à faire</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Nouvelle tâche
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          <Button variant={filter === 'todo' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('todo')}>À faire</Button>
          <Button variant={filter === 'done' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('done')}>Terminées</Button>
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>Toutes</Button>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Assigné à :</span>
            <select
              className="bg-white border border-gray-200 text-sm rounded-lg px-3 py-1.5 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
            >
              <option value="all">Tout le monde</option>
              {(data.employees || []).map(emp => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
            <CheckCircle2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Aucune tâche</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const company = task.companyId ? data.companies.find(c => c.id === task.companyId) : null;
            const assignee = task.assigneeId ? (data.employees || []).find(e => e.id === task.assigneeId) : null;
            
            return (
              <Card key={task.id} className={`border transition-all duration-200 group rounded-2xl ${task.completed ? 'bg-gray-50/80 border-gray-100 opacity-75' : 'bg-white border-gray-200/60 shadow-sm hover:shadow-md hover:border-blue-200'}`}>
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <button 
                    onClick={() => toggleTask(task.id, task.completed)}
                    className={`flex-shrink-0 transition-colors ${task.completed ? 'text-green-500' : 'text-gray-300 hover:text-blue-500'}`}
                  >
                    {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-lg ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                      {task.completed && task.completedAt && (
                        <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-100 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Fait le {formatDateTime(task.completedAt)}
                        </span>
                      )}

                      {!task.completed && task.dueDate && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 text-orange-700 font-medium border border-orange-100">
                          <Clock className="w-3 h-3" /> À faire pour le {formatDateTime(task.dueDate)}
                        </span>
                      )}
                      
                      {assignee && (
                        <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 font-medium">
                          <User className="w-3 h-3" /> {assignee.firstName}
                        </span>
                      )}

                      {company && (
                        <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 font-medium">
                          {company.name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto mt-2 sm:mt-0 flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => { if(confirm('Supprimer cette tâche ?')) deleteTask(task.id); }}
                      className="text-gray-400 hover:text-red-600 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {showForm && (
        <TaskForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
