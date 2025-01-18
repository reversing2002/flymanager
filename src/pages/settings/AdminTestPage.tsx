import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminService } from '../../lib/supabase/adminClient';
import { toast } from 'react-hot-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import AdminTest from '../../components/admin/AdminTest';

const userFormSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(2, 'Prénom trop court'),
  lastName: z.string().min(2, 'Nom trop court'),
  password: z.string().min(6, 'Mot de passe trop court'),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function AdminTestPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      password: '',
    },
  });

  const loadUsers = async () => {
    try {
      const { data } = await adminService.listUsers(user?.club?.id);
      setUsers(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  };

  useEffect(() => {
    if (user?.club?.id) {
      loadUsers();
    }
  }, [user?.club?.id]);

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    try {
      if (selectedUser) {
        await adminService.updateUser(selectedUser.id, {
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
        });
        toast.success('Utilisateur mis à jour avec succès');
      } else {
        await adminService.createUser({
          email: data.email,
          password: data.password,
          userData: {
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
          },
          roles: ['USER'],
          clubId: user?.club?.id,
        });
        toast.success('Utilisateur créé avec succès');
      }
      form.reset();
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    
    setLoading(true);
    try {
      await adminService.deleteUser(userId);
      toast.success('Utilisateur supprimé avec succès');
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    form.reset({
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      password: '', // On ne remplit pas le mot de passe pour des raisons de sécurité
    });
  };

  const handleVerifyAuth = async (userId: string) => {
    try {
      const { data } = await adminService.getAuthUser(userId);
      toast.success(
        data ? 'Utilisateur auth trouvé ✅' : 'Aucun utilisateur auth trouvé ❌'
      );
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la vérification');
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Test Administration Utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <input
                type="email"
                id="email"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <input
                type="text"
                id="firstName"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                {...form.register('firstName')}
              />
              {form.formState.errors.firstName && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="lastName">Nom</Label>
              <input
                type="text"
                id="lastName"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                {...form.register('lastName')}
              />
              {form.formState.errors.lastName && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>

            {!selectedUser && (
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <input
                  type="password"
                  id="password"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedUser ? 'Mettre à jour' : 'Créer'}
              </Button>
              {selectedUser && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null);
                    form.reset();
                  }}
                >
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.last_name}</TableCell>
                  <TableCell>{user.first_name}</TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(user)}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerifyAuth(user.id)}
                    >
                      Vérifier Auth
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(user.id)}
                    >
                      Supprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schéma de la Base de Données</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminTest />
        </CardContent>
      </Card>
    </div>
  );
}
