import { useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Bell, Clock, FileText, Target, CheckCircle2, Circle } from 'lucide-react';

interface NotificationPopupProps {
  onClose: () => void;
}

export default function NotificationPopup({ onClose }: NotificationPopupProps) {
  const { data, getOverdueInvoices, setNotificationRead, currentUser } = useCRM();
  
  const overdueInvoices = getOverdueInvoices();
  
  // Compute upcoming deals (closing in 10 or 7 days)
  const upcomingDeals = useMemo(() => {
    const deals = data.deals || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return deals.filter(deal => {
      if (!deal.expectedCloseDate || deal.stage === 'won' || deal.stage === 'lost') return false;
      const closeDate = new Date(deal.expectedCloseDate);
      closeDate.setHours(0, 0, 0, 0);
      
      const diffTime = closeDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // We consider 7 to 10 days as "Upcoming"
      return diffDays >= 0 && diffDays <= 10;
    }).map(deal => {
      const closeDate = new Date(deal.expectedCloseDate!);
      closeDate.setHours(0, 0, 0, 0);
      const diffTime = closeDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...deal, diffDays };
    }).sort((a, b) => a.diffDays - b.diffDays);
  }, [data.deals]);

  const recentLogs = [...(data.activityLogs || [])].slice(0, 10);

  const readNotificationIds = currentUser ? (data.readNotifications[currentUser.id] || []) : [];

  const handleToggleRead = (id: string, isRead: boolean) => {
    setNotificationRead(id, isRead);
  };

  const isRead = (id: string) => readNotificationIds.includes(id);

  // Prepare normalized notifications array
  const notifications = useMemo(() => {
    const items: any[] = [];
    
    // Invoices
    overdueInvoices.forEach(inv => {
      items.push({
        id: `invoice_overdue_${inv.id}`,
        type: 'important',
        title: `Facture en retard: ${inv.reference}`,
        description: `La facture de ${formatCurrency(inv.totalAmount)} pour ${inv.company?.name || 'Inconnu'} est en retard depuis le ${formatDate(inv.dueDate || inv.date)}.`,
        icon: <FileText className="w-5 h-5 text-red-500" />,
        date: new Date(inv.dueDate || inv.date).getTime()
      });
    });

    // Deals
    upcomingDeals.forEach(deal => {
      items.push({
        id: `deal_closing_${deal.id}`,
        type: 'important',
        title: `Dossier à clôturer: ${deal.title}`,
        description: `La clôture prévue est dans ${deal.diffDays} jour(s) (${formatDate(deal.expectedCloseDate!)}).`,
        icon: <Target className="w-5 h-5 text-orange-500" />,
        date: new Date(deal.expectedCloseDate!).getTime()
      });
    });

    // Logs
    recentLogs.forEach(log => {
      items.push({
        id: `log_${log.id}`,
        type: 'normal',
        title: log.title,
        description: log.description,
        icon: <Bell className="w-5 h-5 text-blue-500" />,
        date: new Date(log.createdAt).getTime()
      });
    });

    return items.sort((a, b) => b.date - a.date);
  }, [overdueInvoices, upcomingDeals, recentLogs]);

  const unreadImportantCount = notifications.filter(n => n.type === 'important' && !isRead(n.id)).length;
  const unreadNormalCount = notifications.filter(n => n.type === 'normal' && !isRead(n.id)).length;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
              <p className="text-sm text-gray-500">
                Vous avez {unreadImportantCount + unreadNormalCount} notification(s) non lue(s).
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="important" className="flex-1 flex flex-col">
            <div className="px-6 pt-4 border-b border-gray-100">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="important" className="relative">
                  Alertes Importantes
                  {unreadImportantCount > 0 && (
                    <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500"></span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="normal" className="relative">
                  Activité & Mises à jour
                  {unreadNormalCount > 0 && (
                    <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-blue-500"></span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              <TabsContent value="important" className="m-0 focus-visible:outline-none space-y-4">
                {notifications.filter(n => n.type === 'important').length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Tout est en ordre !</p>
                    <p className="text-sm text-gray-400 mt-1">Aucune alerte importante pour le moment.</p>
                  </div>
                ) : (
                  notifications.filter(n => n.type === 'important').map(notif => (
                    <NotificationCard 
                      key={notif.id} 
                      notification={notif} 
                      isRead={isRead(notif.id)} 
                      onToggleRead={() => handleToggleRead(notif.id, !isRead(notif.id))} 
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="normal" className="m-0 focus-visible:outline-none space-y-4">
                {notifications.filter(n => n.type === 'normal').length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Aucune activité récente</p>
                  </div>
                ) : (
                  notifications.filter(n => n.type === 'normal').map(notif => (
                    <NotificationCard 
                      key={notif.id} 
                      notification={notif} 
                      isRead={isRead(notif.id)} 
                      onToggleRead={() => handleToggleRead(notif.id, !isRead(notif.id))} 
                    />
                  ))
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function NotificationCard({ notification, isRead, onToggleRead }: { notification: any, isRead: boolean, onToggleRead: () => void }) {
  return (
    <Card className={`transition-all duration-200 ${isRead ? 'opacity-60 bg-gray-50' : 'bg-white shadow-sm border-l-4'} ${!isRead && notification.type === 'important' ? 'border-l-red-500' : ''} ${!isRead && notification.type === 'normal' ? 'border-l-blue-500' : ''}`}>
      <CardContent className="p-4 flex gap-4">
        <div className="mt-1">
          {notification.icon}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h4 className={`font-semibold ${isRead ? 'text-gray-500' : 'text-gray-900'}`}>{notification.title}</h4>
            <button 
              onClick={onToggleRead}
              className="text-gray-400 hover:text-gray-600 flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
              title={isRead ? 'Marquer comme non lu' : 'Marquer comme lu'}
            >
              {isRead ? (
                <>
                  <Circle className="w-3.5 h-3.5" /> Non lu
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Lu
                </>
              )}
            </button>
          </div>
          <p className={`text-sm mt-1 leading-relaxed ${isRead ? 'text-gray-400' : 'text-gray-600'}`}>{notification.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
