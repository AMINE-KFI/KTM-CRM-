import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Mail, Bell, Save, CheckCircle, AlertCircle } from 'lucide-react';
import type { ReminderSettings } from '@/types';
import { formatCurrency, getDaysOverdue, sendReminderEmail } from '@/lib/storage';

export default function SettingsPage() {
  const { data, updateReminderSettings, updateInvoice, getOverdueInvoices } = useCRM();
  const [settings, setSettings] = useState<ReminderSettings>({ ...data.reminderSettings });
  const [saved, setSaved] = useState(false);

  const overdueInvoices = getOverdueInvoices();

  const set = (field: keyof ReminderSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    updateReminderSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSendAllReminders = () => {
    const toSend = overdueInvoices.filter(inv => {
      const daysOver = getDaysOverdue(inv.dueDate);
      const count = inv.reminderCount || 0;
      if (count === 0 && daysOver >= settings.firstReminderDays) return true;
      if (count === 1 && daysOver >= settings.secondReminderDays) return true;
      if (count === 2 && daysOver >= settings.thirdReminderDays) return true;
      return false;
    });

    if (toSend.length === 0) {
      alert('Aucune facture ne nécessite de rappel selon les paramètres actuels.');
      return;
    }

    if (!confirm(`Envoyer des rappels pour ${toSend.length} facture(s) ?`)) return;

    toSend.forEach(inv => {
      const comptaContact = inv.company?.contacts?.find((c: any) => c.department === 'comptabilite');
      const email = comptaContact?.email || inv.company?.email || '';
      const newCount = (inv.reminderCount || 0) + 1;
      
      if (email) {
        const mailtoLink = sendReminderEmail(
          email,
          inv.invoiceNumber,
          inv.totalAmount,
          inv.dueDate,
          newCount,
          settings
        );
        window.open(mailtoLink, '_blank');
      }

      updateInvoice(inv.id, {
        status: 'overdue',
        reminderSent: true,
        reminderCount: newCount,
        lastReminderDate: new Date().toISOString().split('T')[0],
      });
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-0.5">Configurez les rappels automatiques et les informations de votre société</p>
      </div>

      {/* Reminder Settings */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pt-5 pb-3 px-5">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Système de rappels automatiques
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-5">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Activer les rappels</p>
              <p className="text-sm text-gray-500">Envoi automatique d'emails pour les factures impayées</p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={v => set('enabled', v)}
            />
          </div>

          {settings.enabled && (
            <>
              {/* Reminder Days */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-600">Délais de rappel (après la date d'échéance)</h3>
                
                <ReminderDelayRow
                  label="1er rappel"
                  description="Rappel courtois"
                  value={settings.firstReminderDays}
                  onChange={v => set('firstReminderDays', v)}
                  color="amber"
                />
                <ReminderDelayRow
                  label="2ème rappel"
                  description="Relance formelle"
                  value={settings.secondReminderDays}
                  onChange={v => set('secondReminderDays', v)}
                  color="orange"
                />
                <ReminderDelayRow
                  label="3ème rappel"
                  description="Mise en demeure"
                  value={settings.thirdReminderDays}
                  onChange={v => set('thirdReminderDays', v)}
                  color="red"
                />
              </div>

              {/* Sender Info */}
              <div className="space-y-3 pt-2 border-t">
                <h3 className="text-sm font-semibold text-gray-600">Informations de l'expéditeur</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Nom de la société</Label>
                    <Input
                      value={settings.companyName}
                      onChange={e => set('companyName', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nom de l'expéditeur</Label>
                    <Input
                      value={settings.senderName}
                      onChange={e => set('senderName', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Email de contact (comptabilité)</Label>
                    <Input
                      type="email"
                      value={settings.senderEmail}
                      onChange={e => set('senderEmail', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2 border-t">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Enregistré !' : 'Enregistrer'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Overview */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pt-5 pb-3 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Factures en retard ({overdueInvoices.length})
            </CardTitle>
            {overdueInvoices.length > 0 && (
              <Button
                onClick={handleSendAllReminders}
                variant="outline"
                size="sm"
                className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Mail className="w-4 h-4" />
                Envoyer tous les rappels
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {overdueInvoices.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" />
              <p className="text-gray-400">Toutes les factures sont à jour !</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueInvoices.map(inv => {
                const days = getDaysOverdue(inv.dueDate);
                const needsReminder = (() => {
                  const count = inv.reminderCount || 0;
                  if (count === 0 && days >= settings.firstReminderDays) return true;
                  if (count === 1 && days >= settings.secondReminderDays) return true;
                  if (count === 2 && days >= settings.thirdReminderDays) return true;
                  return false;
                })();

                return (
                  <div key={inv.id} className={`flex items-center justify-between p-3 rounded-lg border ${needsReminder ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{inv.invoiceNumber}</span>
                        {needsReminder && (
                          <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-semibold">Rappel requis</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{inv.company?.name} · {days} jours de retard · {inv.reminderCount || 0} rappel(s) envoyé(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-red-700">{formatCurrency(inv.totalAmount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReminderDelayRow({
  label, description, value, onChange, color
}: {
  label: string; description: string; value: number; onChange: (v: number) => void; color: string;
}) {
  const colorMap: Record<string, string> = {
    amber: 'text-amber-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
      <div className="w-28 flex-shrink-0">
        <p className={`text-sm font-semibold ${colorMap[color]}`}>{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <div className="flex-1">
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={1}
          max={60}
          step={1}
          className="w-full"
        />
      </div>
      <div className="w-24 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value}
            onChange={e => onChange(parseInt(e.target.value) || 1)}
            min={1}
            max={60}
            className="w-16 h-8 text-sm text-center"
          />
          <span className="text-xs text-gray-400">jours</span>
        </div>
      </div>
    </div>
  );
}
