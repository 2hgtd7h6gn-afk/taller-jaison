import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Car, Wrench, ClipboardList, CheckCircle2, 
  Clock, ChevronRight, LayoutDashboard, 
  Trash2, ArrowLeft, Printer, AlertTriangle,
  FileText, CheckSquare, UserPlus, MessageSquare,
  X, CreditCard, History, CalendarDays, Archive, Mail, Link as LinkIcon
} from 'lucide-react';

// --- FUNCIONES AUXILIARES (CORREGIDAS: VARIABLES NO USADAS) ---
const safeBtoa = (str: string) => {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      // EL CAMBIO ESTÁ AQUI: Usamos '_' para decirle a TS que ignore el primer argumento
      function toSolidBytes(_: any, p1: any) {
          return String.fromCharCode(parseInt(p1, 16));
  }));
};

const safeAtob = (str: string) => {
  return decodeURIComponent(atob(str).split('').map(function(c: any) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
};

// --- CONFIGURACIÓN ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzr5yPpZmAOOGgGR3-dmhqrdnsAi_bTJUMcPt5s5MuS6rQtP2EJFT5q6bXvty9eZrWt/exec";
const API_TOKEN = "TALLER_JAISON_SECURE_2026";

// --- Tipos y Modelos ---
type ServiceStatus = 'recibido' | 'diagnostico' | 'espera_repuestos' | 'reparacion' | 'listo' | 'entregado';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
}

interface LineItem {
  description: string;
  price: number;
}

interface InspectionPart {
  id: string;
  label: string;
  damaged: boolean;
}

interface Inspection {
  parts: InspectionPart[];
  notes: string;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  type: 'total' | 'partial';
  note: string;
}

interface ServiceOrder {
  id: string;
  vehicleId: string;
  clientId: string;
  description: string;
  servicePerformedNotes?: string;
  status: ServiceStatus;
  entryDate: string;
  miles: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  applyIVU: boolean;
  inspection: Inspection;
  payments: Payment[]; 
  isPaid: boolean;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  garage: Vehicle[];
}

// --- CONSTANTES ---
const PAYMENT_METHODS = [
  "Efectivo", "Ath Móvil", "Tarjeta de débito", "Tarjeta de crédito", "Cheque"
];

const RAW_PARTS_LIST = [
  "Bonete", "Foco delantero Izq", "Foco delantero Der", "Foglight frontal Izq", "Foglight delantero Der",
  "Whipers", "Bumper Delantero", "Guardalodo del. Der", "Guardalodo del. Izq",
  "Goma delantera Der", "Goma delantera Izq", "Cristal frontal", "Puerta frontal Izq", "Puerta frontal Der",
  "Ventana frontal Izq", "Ventana frontal Der", "Retrovisor Izq", "Retrovisor Der",
  "Capota", "Sunroof", "Spoiler", "Antena", "Panel trasero Izq", "Panel trasero Der", 
  "Puerta trasera Izq", "Puerta trasera Der", "Ventana trasera Izq", "Ventana trasera Der", 
  "Baúl", "Puerta de baúl", "Foco de Stop Der", "Foco de Stop Izq", "Luces de Reversa", 
  "Bumper trasero", "Muffler", "Cámara de Reversa", "Tablilla"
];

const DEFAULT_INSPECTION_PARTS: InspectionPart[] = RAW_PARTS_LIST.map((label, index) => ({
  id: `part_${index}`,
  label: label,
  damaged: false
}));

const COMMON_SERVICES = [
  "Cambio de Aceite y Filtro", "Lavado de Chasis", "Frenos", "Alineación", 
  "Diagnóstico", "Aire Acondicionado", "Batería", "Gomas", "Tune-up", "Otro"
];

const statusConfig: Record<ServiceStatus, { label: string, color: string, icon: any }> = {
  recibido: { label: 'Recibido', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: ClipboardList },
  diagnostico: { label: 'En Diagnóstico', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Search },
  espera_repuestos: { label: 'Repuestos', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock },
  reparacion: { label: 'En Reparación', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Wrench },
  listo: { label: 'Listo', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  entregado: { label: 'Entregado', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Car },
};

const formatPlate = (val: string) => {
  let v = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (v.length > 6) v = v.slice(0, 6);
  if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3);
  return v;
};

const formatPhone = (val: string) => {
  let v = val.replace(/\D/g, '');
  if (v.length > 10) v = v.slice(0, 10);
  if (v.length > 6) return `(${v.slice(0, 3)}) ${v.slice(3, 6)}-${v.slice(6)}`;
  return v;
};

// --- COMPONENTE PRINCIPAL ---
function App() {
  const [sharedReceiptData, setSharedReceiptData] = useState<{order: ServiceOrder, client: Client} | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const [view, setView] = useState<'dashboard' | 'register' | 'history' | 'details' | 'settings' | 'receipt'>('dashboard');
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'ready'>('all');

  useEffect(() => {
    // 1. Detección de Recibo Compartido (Con soporte de Tildes)
    const params = new URLSearchParams(window.location.search);
    const receiptData = params.get('r');
    
    if (receiptData) {
        try {
            // Usamos safeAtob para decodificar tildes correctamente
            const jsonString = safeAtob(receiptData);
            const decoded = JSON.parse(jsonString);
            setSharedReceiptData(decoded);
        } catch (e) {
            console.error("Error decodificando recibo", e);
            setReceiptError("El enlace del recibo parece estar incompleto o dañado.");
        }
    } else {
        // 2. Carga normal de datos (Solo si no hay recibo en URL)
        const savedClients = localStorage.getItem('jaison_clients');
        if (savedClients) setClients(JSON.parse(savedClients));
        const savedOrders = localStorage.getItem('jaison_orders');
        if (savedOrders) setOrders(JSON.parse(savedOrders));
    }
  }, []);

  useEffect(() => {
    if (!sharedReceiptData && clients.length > 0) localStorage.setItem('jaison_clients', JSON.stringify(clients));
  }, [clients, sharedReceiptData]);

  useEffect(() => {
    if (!sharedReceiptData && orders.length > 0) localStorage.setItem('jaison_orders', JSON.stringify(orders));
  }, [orders, sharedReceiptData]);

  // --- MODO INVITADO (Recibo Compartido) ---
  if (sharedReceiptData) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <ReceiptView order={sharedReceiptData.order} client={sharedReceiptData.client} onClose={() => {}} isSharedMode={true} />
                <div className="bg-slate-50 p-4 text-center text-[10px] text-slate-400 border-t border-slate-100">
                    <p>Documento digital generado por <strong>Jaison Auto Repair App</strong></p>
                </div>
            </div>
        </div>
      );
  }

  // --- MODO ERROR (Si el link falla) ---
  if (receiptError) {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
              <div className="bg-slate-800 p-8 rounded-3xl border border-red-500/50 max-w-sm">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Enlace Inválido</h3>
                  <p className="text-slate-400 text-sm mb-6">{receiptError}</p>
                  <a href="/" className="bg-indigo-600 text-white py-3 px-6 rounded-xl font-bold text-sm">Ir al Inicio</a>
              </div>
          </div>
      );
  }

  // --- MODO ADMIN (JAISON) ---
  const handleSaveOrder = async (newOrder: ServiceOrder, directClient?: Client, directVehicle?: Vehicle) => {
    setOrders(prev => {
        const exists = prev.some(o => o.id === newOrder.id);
        if (exists) {
            return prev.map(o => o.id === newOrder.id ? newOrder : o);
        }
        return [newOrder, ...prev];
    });
    
    const client = directClient || clients.find(c => c.id === newOrder.clientId);
    const vehicle = directVehicle || client?.garage.find(v => v.id === newOrder.vehicleId);

    const totalPaid = newOrder.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const debt = newOrder.total - totalPaid;
    const lastMethod = newOrder.payments?.length > 0 
        ? newOrder.payments[newOrder.payments.length - 1].method 
        : "Pendiente";

    const payload = {
      token: API_TOKEN, 
      orden_id: newOrder.id,
      estado: newOrder.status,
      cliente_nombre: client ? client.name : "Error Cliente",
      cliente_telefono: client ? client.phone : "",
      vehiculo_info: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.year})` : "Error Vehículo",
      vehiculo_placa: vehicle ? vehicle.plate : "S/T",
      falla_reportada: newOrder.description,
      trabajo_realizado: newOrder.servicePerformedNotes || "Pendiente",
      items_servicio: JSON.stringify(newOrder.items),
      total: newOrder.total,
      pagado: totalPaid,
      deuda: debt,
      metodo_pago: lastMethod
    };

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Error enviando a Google:', error);
    }
  };

  const handleUpdateOrder = (updatedOrder: ServiceOrder) => {
    const updatedOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    setOrders(updatedOrders);
    setSelectedOrder(updatedOrder);
    handleSaveOrder(updatedOrder);
  };

  const stats = useMemo(() => ({
    active: orders.filter(o => !['entregado', 'listo'].includes(o.status)).length,
    ready: orders.filter(o => o.status === 'listo').length,
    total: orders.length
  }), [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const client = clients.find(c => c.id === o.clientId);
      const vehicle = client?.garage.find(v => v.id === o.vehicleId);
      const matchesSearch = (
        (client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vehicle?.plate || '').toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (view === 'history') return matchesSearch && o.status === 'entregado';

      if (filterMode === 'active') return matchesSearch && !['entregado', 'listo'].includes(o.status);
      if (filterMode === 'ready') return matchesSearch && o.status === 'listo';
      
      return matchesSearch && o.status !== 'entregado';
    });
  }, [orders, clients, searchTerm, filterMode, view]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-indigo-500">
      <header className="bg-slate-900 border-b border-slate-800 p-5 sticky top-0 z-50 flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Jaison Auto Repair Logo" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-xl font-black tracking-tighter leading-none text-white">JAISON AUTO REPAIR</h1>
            <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Service & A/C</span>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-xl mx-auto">
        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setFilterMode(filterMode === 'active' ? 'all' : 'active')} className={`p-5 rounded-3xl border transition-all text-left shadow-xl ${filterMode === 'active' ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">En Taller</span>
                <span className="text-4xl font-black text-indigo-500">{stats.active}</span>
              </button>
              <button onClick={() => setFilterMode(filterMode === 'ready' ? 'all' : 'ready')} className={`p-5 rounded-3xl border transition-all text-left shadow-xl ${filterMode === 'ready' ? 'bg-green-900/30 border-green-500' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Listos</span>
                <span className="text-4xl font-black text-green-500">{stats.ready}</span>
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setFilterMode('all'); setView('register'); }} className="flex-1 bg-indigo-600 text-white p-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-indigo-900 active:scale-95 transition-all">
                <Plus className="w-5 h-5" /> Nueva Orden
              </button>
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
            </div>

            <div className="space-y-3">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(o => (
                  <OrderCard key={o.id} order={o} client={clients.find(c => c.id === o.clientId)} onClick={() => { setSelectedOrder(o); setView('details'); }} />
                ))
              ) : (
                <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
                  <Car className="w-12 h-12 mx-auto text-slate-800 mb-2" />
                  <p className="text-slate-600 font-bold">No hay activos</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-6">
             <div className="flex items-center gap-2 mb-4">
                <Archive className="text-indigo-400" />
                <h2 className="text-xl font-black text-white">Historial Entregados</h2>
             </div>
             
             <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Buscar en historial..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
             </div>

             <div className="space-y-3">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(o => (
                  <OrderCard key={o.id} order={o} client={clients.find(c => c.id === o.clientId)} onClick={() => { setSelectedOrder(o); setView('details'); }} />
                ))
              ) : (
                <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
                  <Archive className="w-12 h-12 mx-auto text-slate-800 mb-2" />
                  <p className="text-slate-600 font-bold">Sin historial</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'register' && (
          <RegistrationProcess 
            clients={clients} 
            setClients={setClients} 
            onSave={(newOrder: ServiceOrder, finalClient: Client, finalVehicle: Vehicle) => { 
                handleSaveOrder(newOrder, finalClient, finalVehicle); 
                setFilterMode('all'); 
                setView('dashboard'); 
            }} 
            onCancel={() => setView('dashboard')} 
          />
        )}

        {view === 'details' && selectedOrder && (
          <OrderDetails order={selectedOrder} client={clients.find(c => c.id === selectedOrder.clientId)} onClose={() => setView('dashboard')} onUpdateOrder={handleUpdateOrder} onDelete={() => { if(confirm('¿Borrar?')) { setOrders(orders.filter(o => o.id !== selectedOrder.id)); setView('dashboard'); }}} onViewReceipt={() => setView('receipt')} />
        )}

        {view === 'receipt' && selectedOrder && (
          <ReceiptView order={selectedOrder} client={clients.find(c => c.id === selectedOrder.clientId)} onClose={() => setView('details')} isSharedMode={false} />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 flex justify-around items-center no-print">
        <NavButton active={view === 'dashboard'} icon={LayoutDashboard} label="Inicio" onClick={() => { setFilterMode('all'); setView('dashboard'); }} />
        <NavButton active={view === 'register'} icon={Plus} label="Nueva" onClick={() => setView('register')} highlight />
        <NavButton active={view === 'history'} icon={History} label="Historial" onClick={() => { setSearchTerm(''); setView('history'); }} />
      </nav>
    </div>
  );
}

// --- SUB-COMPONENTES ---

const NavButton = ({ icon: Icon, label, active, onClick, highlight }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 ${highlight ? 'bg-indigo-600 text-white rounded-2xl -mt-10 w-16 h-16 shadow-2xl transition-all active:scale-95' : active ? 'text-indigo-400' : 'text-slate-500'}`}>
    <Icon className={highlight ? 'w-8 h-8' : 'w-5 h-5'} />
    {!highlight && <span className="text-[10px] font-bold uppercase">{label}</span>}
  </button>
);

const OrderCard = ({ order, client, onClick }: any) => {
  const status = statusConfig[order.status as ServiceStatus] || statusConfig['recibido'];
  const vehicle = client?.garage.find((v: any) => v.id === order.vehicleId);
  return (
    <div onClick={onClick} className="bg-slate-900 p-4 rounded-3xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center gap-4 active:scale-[0.98]">
      <div className={`w-12 h-12 rounded-2xl ${status.color.split(' ')[0]} flex items-center justify-center shrink-0`}>
        <status.icon className="w-6 h-6" />
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-start mb-0.5">
          <h3 className="font-black text-white uppercase tracking-tighter truncate">{client?.name}</h3>
          <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase border shrink-0 ${status.color}`}>{status.label}</span>
        </div>
        <p className="text-xs text-slate-300 font-bold truncate mb-0.5">
            {vehicle?.brand} {vehicle?.model} ({vehicle?.year})
        </p>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest truncate">TABLILLA: {vehicle?.plate || 'S/T'}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-700 shrink-0" />
    </div>
  );
};

const RegistrationProcess = ({ clients, setClients, onSave, onCancel }: any) => {
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  
  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '' });
  const [vehicleForm, setVehicleForm] = useState({ plate: '', brand: '', model: '', year: '2024', color: '' });
  const [orderForm, setOrderForm] = useState({ miles: '', description: '', servicePerformedNotes: '', applyIVU: true });
  
  const [items, setItems] = useState<LineItem[]>([]);
  const [tempService, setTempService] = useState({ description: '', price: '' });
  
  const [inspectionParts, setInspectionParts] = useState<InspectionPart[]>(DEFAULT_INSPECTION_PARTS);
  const [partSearch, setPartSearch] = useState(''); 
  const [manualPartInput, setManualPartInput] = useState('');

  const currentSubtotal = useMemo(() => items.reduce((acc, i) => acc + i.price, 0), [items]);
  const currentIVU = useMemo(() => orderForm.applyIVU ? currentSubtotal * 0.115 : 0, [currentSubtotal, orderForm.applyIVU]);
  const currentTotal = useMemo(() => currentSubtotal + currentIVU, [currentSubtotal, currentIVU]);

  const filteredClients = useMemo(() => {
    const s = clientSearch.trim().toLowerCase();
    if (!s) return [];
    return clients.filter((c: Client) => c.name.toLowerCase().includes(s) || c.phone.includes(s));
  }, [clients, clientSearch]);

  const togglePart = (id: string) => setInspectionParts(prev => prev.map(p => p.id === id ? { ...p, damaged: !p.damaged } : p));
  
  const addManualPart = () => {
    if (!manualPartInput.trim()) return;
    setInspectionParts(prev => [...prev, { id: `m_${Date.now()}`, label: manualPartInput.trim(), damaged: true }]);
    setManualPartInput('');
  };

  const handleAddService = () => {
    if (!tempService.description.trim()) return;
    const price = parseFloat(tempService.price) || 0;
    setItems(prev => [...prev, { description: tempService.description, price }]);
    setTempService({ description: '', price: '' });
  };

  const handleCreateOrder = () => {
    let finalClient = selectedClient;
    let finalVehicle = selectedVehicle;

    if (!finalClient) {
      const newClient = { id: Date.now().toString(), ...clientForm, garage: [] };
      setClients((prev: Client[]) => [...prev, newClient]);
      finalClient = newClient;
    }

    if (!finalVehicle) {
      const newVehicle = { id: (Date.now() + 1).toString(), ...vehicleForm };
      const updatedClient = { ...finalClient, garage: [...finalClient.garage, newVehicle] };
      setClients((prev: Client[]) => prev.map(c => c.id === finalClient?.id ? updatedClient : c));
      finalVehicle = newVehicle;
      finalClient = updatedClient;
    }

    const newOrder: ServiceOrder = {
      id: `ORD-${Date.now()}`,
      clientId: finalClient.id,
      vehicleId: finalVehicle.id,
      ...orderForm,
      items,
      subtotal: currentSubtotal,
      tax: currentIVU,
      total: currentTotal,
      status: 'recibido',
      entryDate: new Date().toISOString(),
      inspection: { parts: inspectionParts.filter(p => p.damaged), notes: '' },
      payments: [],
      isPaid: false
    };
    onSave(newOrder, finalClient, finalVehicle);
  };

  const canProceedFromStep1 = () => {
    const hasClient = selectedClient || clientForm.name;
    const hasVehicle = selectedVehicle || vehicleForm.plate;
    return hasClient && hasVehicle;
  };

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
       <div className="p-6 bg-slate-800 flex justify-between items-center sticky top-0 z-10">
         <h2 className="font-black flex items-center gap-2 text-white">
            {step === 1 && <span className="text-indigo-400">PASO 1: DATOS GENERALES</span>}
            {step === 2 && <span className="text-indigo-400">PASO 2: Inspección de vehículo al entregar</span>}
            {step === 3 && <span className="text-indigo-400">PASO 3: SERVICIOS</span>}
         </h2>
         <div className="flex gap-1">
            <div className={`h-2 w-8 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-slate-700'}`} />
            <div className={`h-2 w-8 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-700'}`} />
            <div className={`h-2 w-8 rounded-full ${step >= 3 ? 'bg-indigo-500' : 'bg-slate-700'}`} />
         </div>
       </div>

       <div className="p-6 space-y-6">
         {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="text-indigo-400 w-5 h-5" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Información del Cliente</h3>
                </div>

                {!selectedClient && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input 
                            placeholder="Buscar cliente existente..." 
                            className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                            value={clientSearch} 
                            onChange={e => setClientSearch(e.target.value)} 
                        />
                        {clientSearch && filteredClients.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                                {filteredClients.map((c: Client) => (
                                    <button 
                                        key={c.id} 
                                        onClick={() => { setSelectedClient(c); setClientSearch(''); }} 
                                        className="w-full p-3 text-left hover:bg-slate-700 border-b border-slate-700/50 last:border-0"
                                    >
                                        <p className="font-bold text-white">{c.name}</p>
                                        <p className="text-xs text-slate-400">{c.phone}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {selectedClient ? (
                    <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl flex justify-between items-center">
                        <div>
                            <p className="font-black text-indigo-400">{selectedClient.name}</p>
                            <p className="text-xs text-slate-400">{selectedClient.phone}</p>
                        </div>
                        <button onClick={() => { setSelectedClient(null); setSelectedVehicle(null); }} className="text-xs font-bold text-slate-500 hover:text-white underline">Cambiar</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 pl-2 border-l-2 border-slate-800">
                        <Input label="Nombre Completo" value={clientForm.name} onChange={(v: string) => setClientForm({...clientForm, name: v})} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Teléfono" value={clientForm.phone} onChange={(v: string) => setClientForm({...clientForm, phone: formatPhone(v)})} type="tel" />
                            <Input label="Email (Opcional)" value={clientForm.email} onChange={(v: string) => setClientForm({...clientForm, email: v})} type="email" />
                        </div>
                    </div>
                )}
              </div>

              <div className="h-px bg-slate-800" />

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Car className="text-indigo-400 w-5 h-5" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Información del Vehículo</h3>
                </div>

                {selectedClient && selectedClient.garage.length > 0 && !selectedVehicle && (
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase">Seleccionar del Garaje:</p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {selectedClient.garage.map((v: Vehicle) => (
                                <button key={v.id} onClick={() => setSelectedVehicle(v)} className="shrink-0 p-3 bg-slate-800 border border-slate-700 rounded-xl text-left hover:border-indigo-500 min-w-[120px]">
                                    <p className="font-black text-xs text-white">{v.plate}</p>
                                    <p className="text-[10px] text-slate-400">{v.brand} {v.model}</p>
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-center text-slate-600 mt-2">- O registra uno nuevo abajo -</p>
                    </div>
                )}

                {selectedVehicle ? (
                    <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl flex justify-between items-center">
                         <div>
                            <p className="font-black text-green-400">{selectedVehicle.plate}</p>
                            <p className="text-xs text-slate-400">{selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.year})</p>
                        </div>
                        <button onClick={() => setSelectedVehicle(null)} className="text-xs font-bold text-slate-500 hover:text-white underline">Cambiar</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 pl-2 border-l-2 border-slate-800">
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Marca" value={vehicleForm.brand} onChange={(v:string) => setVehicleForm({...vehicleForm, brand: v})} placeholder="Ej: Toyota" />
                            <Input label="Modelo" value={vehicleForm.model} onChange={(v:string) => setVehicleForm({...vehicleForm, model: v})} placeholder="Ej: Corolla" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Tablilla" value={vehicleForm.plate} onChange={(v:string) => setVehicleForm({...vehicleForm, plate: formatPlate(v)})} placeholder="ABC-123" />
                            <Input label="Color" value={vehicleForm.color} onChange={(v:string) => setVehicleForm({...vehicleForm, color: v})} placeholder="Rojo" />
                        </div>
                        <Input label="Año" value={vehicleForm.year} onChange={(v:string) => setVehicleForm({...vehicleForm, year: v})} type="number" />
                    </div>
                )}

                <div className="pt-2">
                    <Input label="Millaje Actual" value={orderForm.miles} onChange={(v:string) => setOrderForm({...orderForm, miles: v})} type="number" placeholder="Ej: 54000" />
                </div>
              </div>
            </div>
         )}

         {step === 2 && (
             <div className="space-y-4 animate-in slide-in-from-right-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Falla Reportada</label>
                    <textarea 
                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl h-20 outline-none text-sm focus:border-indigo-500 transition-colors" 
                        value={orderForm.description} 
                        onChange={e => setOrderForm({...orderForm, description: e.target.value})} 
                        placeholder="¿Qué le sucede al vehículo?"
                    />
                 </div>

                 <div className="h-px bg-slate-800 my-2" />

                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input 
                      placeholder="Buscar pieza..." 
                      className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                      value={partSearch}
                      onChange={e => setPartSearch(e.target.value)}
                    />
                    {partSearch && (
                        <button 
                            onClick={() => setPartSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-800 rounded-full text-slate-400 hover:bg-slate-700 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar">
                     {inspectionParts
                        .filter(p => p.label.toLowerCase().includes(partSearch.toLowerCase()))
                        .map(p => (
                            <button key={p.id} onClick={() => togglePart(p.id)} className={`p-4 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-2 text-center ${p.damaged ? 'bg-red-900/40 border-red-500 text-red-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                {p.damaged && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                {p.label}
                            </button>
                        ))
                     }
                 </div>

                 <div className="mt-4 pt-4 border-t border-slate-800">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Añadir otra parte manual:</p>
                    <div className="flex gap-2">
                        <input className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm" value={manualPartInput} onChange={e => setManualPartInput(e.target.value)} placeholder="Ej: Techo..." />
                        <button onClick={addManualPart} className="bg-slate-700 p-3 rounded-xl"><Plus className="w-4 h-4" /></button>
                    </div>
                 </div>
             </div>
         )}
         
         {step === 3 && (
          <div className="space-y-4 animate-in slide-in-from-right-4">
            
            <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Plus className="w-3 h-3" /> Añadir Servicio
              </p>
              <div className="flex gap-2 flex-wrap">
                <select 
                  className="flex-grow p-3 bg-slate-950 border border-slate-800 rounded-xl outline-none text-sm cursor-pointer min-w-[150px]"
                  value={tempService.description}
                  onChange={(e) => setTempService({ ...tempService, description: e.target.value })}
                >
                  <option value="">-- Elige servicio --</option>
                  {COMMON_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative w-24">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                        <input 
                        type="number" 
                        placeholder="0.00"
                        value={tempService.price}
                        onChange={e => setTempService({ ...tempService, price: e.target.value })}
                        className="w-full pl-6 p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm outline-none"
                        />
                    </div>
                    <button 
                    onClick={handleAddService}
                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors"
                    >
                    <Plus className="w-5 h-5" />
                    </button>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {items.length > 0 ? items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-slate-800 rounded-xl border border-slate-700 animate-in fade-in">
                  <span className="text-xs font-bold truncate pr-4">{it.description}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-black text-indigo-400">${it.price.toFixed(2)}</span>
                    <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                </div>
              )) : (
                <p className="text-center text-[10px] text-slate-600 py-4 uppercase font-black border border-dashed border-slate-800 rounded-2xl">Sin servicios agregados</p>
              )}
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Notas del Técnico</label>
              <textarea 
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl h-20 outline-none text-sm focus:border-indigo-500 transition-colors" 
                value={orderForm.servicePerformedNotes} 
                onChange={e => setOrderForm({...orderForm, servicePerformedNotes: e.target.value})} 
                placeholder="Observaciones o trabajo realizado..."
              />
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-900/30 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-500 uppercase">Cobro</label>
                <button 
                  onClick={() => setOrderForm({...orderForm, applyIVU: !orderForm.applyIVU})}
                  className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 font-black text-[10px] ${orderForm.applyIVU ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                >
                  {orderForm.applyIVU ? 'IVU ON' : 'IVU OFF'}
                </button>
              </div>
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>Subtotal</span>
                  <span>${currentSubtotal.toFixed(2)}</span>
                </div>
                {orderForm.applyIVU && (
                  <div className="flex justify-between text-[10px] font-bold text-indigo-400">
                    <span>IVU (11.5%)</span>
                    <span>${currentIVU.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black text-white pt-1 border-t border-slate-800 mt-1">
                  <span>Total</span>
                  <span className="text-green-400">${currentTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
         )}

         <div className="flex gap-3 pt-2">
             <button onClick={onCancel} className="flex-1 py-4 bg-slate-800 text-slate-400 font-bold rounded-2xl hover:bg-slate-700 transition-colors">
                Cancelar
             </button>
             
             {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="px-6 py-4 bg-slate-700 text-white font-bold rounded-2xl">
                    <ArrowLeft className="w-5 h-5" />
                </button>
             )}

             {step < 3 ? (
                 <button 
                    onClick={() => {
                        if (step === 1 && canProceedFromStep1()) setStep(2);
                        else if (step === 2) setStep(3);
                        else if (step === 1) alert("Por favor completa los datos del cliente y el vehículo.");
                    }}
                    className={`flex-2 flex-grow py-4 font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${
                        (step === 1 && !canProceedFromStep1()) ? 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-indigo-900 hover:bg-indigo-500'
                    }`}
                 >
                    Siguiente <ChevronRight className="w-5 h-5" />
                 </button>
             ) : (
                 <button 
                    onClick={handleCreateOrder} 
                    className="flex-2 flex-grow py-4 bg-green-600 text-white font-bold rounded-2xl shadow-xl shadow-green-900 hover:bg-green-500 transition-all flex items-center justify-center gap-2"
                 >
                    <CheckCircle2 className="w-5 h-5" /> Finalizar Orden
                 </button>
             )}
         </div>
       </div>
    </div>
  );
};

// --- COMPONENTE DETALLES ---
const OrderDetails = ({ order, client, onClose, onUpdateOrder, onDelete, onViewReceipt }: any) => {
  const vehicle = client?.garage.find((v: any) => v.id === order.vehicleId);
  const [notes, setNotes] = useState(order.servicePerformedNotes || '');
  
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('partial');
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentNote, setNewPaymentNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');

  const totalPaid = order.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
  const remainingBalance = order.total - totalPaid;

  useEffect(() => {
    if (paymentType === 'full') {
        setNewPaymentAmount(remainingBalance.toFixed(2));
        setNewPaymentNote('Pago Completo');
    } else {
        setNewPaymentAmount('');
        setNewPaymentNote('');
    }
  }, [paymentType, remainingBalance]);

  const handleAddPayment = () => {
    if (!newPaymentAmount) return;
    const amount = parseFloat(newPaymentAmount);
    if (amount <= 0) return;

    const newPayment: Payment = {
      id: `pay_${Date.now()}`,
      date: new Date().toLocaleString(),
      amount: amount,
      method: paymentMethod,
      type: paymentType === 'full' ? 'total' : 'partial',
      note: newPaymentNote || 'Abono'
    };

    const updatedPayments = [...(order.payments || []), newPayment];
    const newTotalPaid = totalPaid + amount;
    const isPaid = newTotalPaid >= order.total - 0.01;

    onUpdateOrder({
      ...order,
      payments: updatedPayments,
      isPaid: isPaid
    });

    setNewPaymentAmount('');
    setNewPaymentNote('');
    setPaymentType('partial');
  };

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
      <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <button onClick={onClose}><ArrowLeft className="text-slate-400" /></button>
        <h2 className="font-black text-white">{vehicle?.plate}</h2>
      </div>
      <div className="p-6 space-y-6">
        
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Gestión de Pagos
            </h3>
            
            <div className="flex justify-between items-end mb-4 p-4 bg-slate-900 rounded-xl">
                <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Total Orden</p>
                    <p className="text-lg font-black text-white">${order.total.toFixed(2)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Deuda Pendiente</p>
                    <p className={`text-2xl font-black ${remainingBalance <= 0.01 ? 'text-green-500' : 'text-red-500'}`}>
                        ${remainingBalance > 0 ? remainingBalance.toFixed(2) : '0.00'}
                    </p>
                </div>
            </div>

            {remainingBalance > 0.01 && (
                <div className="mb-4">
                    <div className="flex gap-2 mb-3">
                        <button onClick={() => setPaymentType('full')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${paymentType === 'full' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><CheckSquare className="w-4 h-4 inline mr-1" /> Pagar Totalidad</button>
                        <button onClick={() => setPaymentType('partial')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${paymentType === 'partial' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><CalendarDays className="w-4 h-4 inline mr-1" /> Abonar / Plazos</button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <select className="w-1/3 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none text-white font-bold" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                {PAYMENT_METHODS.map(m => <option key={m} value={m} className="bg-slate-800 text-white">{m}</option>)}
                            </select>
                            <input type="number" placeholder="Monto ($)" className="w-24 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none text-white" value={newPaymentAmount} onChange={e => setNewPaymentAmount(e.target.value)} readOnly={paymentType === 'full'} />
                            <button onClick={handleAddPayment} className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-500 flex-1 flex justify-center items-center font-bold"><Plus className="w-5 h-5 mr-1" /> Registrar</button>
                        </div>
                        <input type="text" placeholder="Nota opcional..." className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none text-white" value={newPaymentNote} onChange={e => setNewPaymentNote(e.target.value)} />
                    </div>
                </div>
            )}

            {order.payments && order.payments.length > 0 && (
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Historial de Abonos</p>
                    {order.payments.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center text-xs p-3 bg-slate-900 rounded-xl border border-slate-800">
                            <div>
                                <span className="block text-slate-400 font-bold mb-0.5">{new Date(p.date).toLocaleDateString()}</span>
                                <span className="text-slate-500">{p.method} {p.note ? `• ${p.note}` : ''}</span>
                            </div>
                            <span className="font-black text-green-400 text-sm">${p.amount.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold">Falla Reportada</p>
            <p className="text-sm">{order.description}</p>
        </div>
        
        <div>
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Notas del Técnico</p>
            <textarea className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white" value={notes} onChange={e => setNotes(e.target.value)} />
            <button onClick={() => onUpdateOrder({...order, servicePerformedNotes: notes})} className="w-full mt-2 bg-indigo-600 py-2 rounded-lg text-xs font-bold text-white">Guardar Notas</button>
        </div>

        <div className="grid grid-cols-2 gap-2">
             {(Object.keys(statusConfig) as ServiceStatus[]).map(s => (
               <button key={s} onClick={() => onUpdateOrder({ ...order, status: s })} className={`p-2 rounded border text-[10px] font-bold uppercase ${order.status === s ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>{statusConfig[s].label}</button>
             ))}
        </div>
        <button onClick={onViewReceipt} className="w-full py-4 bg-slate-800 text-indigo-400 font-bold rounded-xl border border-slate-700 flex justify-center gap-2"><FileText size={20} /> VER RECIBO</button>
        <button onClick={onDelete} className="w-full py-3 text-red-500 text-xs font-bold">Eliminar Orden</button>
      </div>
    </div>
  );
};

const ReceiptView = ({ order, client, onClose, isSharedMode }: any) => {
    const vehicle = client?.garage.find((v: any) => v.id === order.vehicleId);
    
    // CORRECCIÓN TS7006: Definimos el tipo de 'p'
    const totalPaid = order.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
    const remainingBalance = order.total - totalPaid;
    const isFullyPaid = remainingBalance <= 0.01;

    const lastPaymentDate = order.payments && order.payments.length > 0 
        ? new Date(order.payments[order.payments.length - 1].date).toLocaleString() 
        : new Date().toLocaleString();

    // GENERAR LINK "ESTILO CLOVER"
    const generateSharedLink = () => {
        const data = JSON.stringify({ order, client });
        // Usamos la nueva función segura para tildes
        const encoded = safeBtoa(data); 
        return `https://taller-jaison.vercel.app/?r=${encoded}`;
    };

    const shareWhatsapp = () => {
        const link = generateSharedLink();
        const text = `*JAISON AUTO REPAIR*\nHola ${client.name}, ve tu recibo aquí:\n${link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    };
    const shareSMS = () => {
        const link = generateSharedLink();
        const text = `JAISON AUTO REPAIR: Hola ${client.name}, ve tu recibo aqui: ${link}`;
        window.open(`sms:${client.phone}?body=${encodeURIComponent(text)}`);
    };
    const shareEmail = () => {
        const link = generateSharedLink();
        const subject = `Recibo de Servicio - ${vehicle.plate}`;
        const body = `Hola ${client.name},\n\nAquí tienes el resumen de tu servicio en JAISON AUTO REPAIR.\n\nPuedes ver el recibo detallado en este enlace:\n${link}\n\nGracias por tu preferencia.`;
        window.open(`mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };
    
    // Botón extra solo para copiar el link
    const copyLink = async () => {
        const link = generateSharedLink();
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(link);
                alert("Enlace copiado al portapapeles");
            } catch (err) {
                console.error('Error copiando', err);
            }
        } else {
            alert("Copia este link: " + link);
        }
    };

    return (
        <div className={`bg-white text-slate-900 min-h-screen ${isSharedMode ? '' : 'fixed inset-0 z-50 overflow-y-auto'}`}>
            <style>{`@media print { .no-print-force { display: none !important; } @page { margin: 0; } body { -webkit-print-color-adjust: exact; } }`}</style>
            
            {!isSharedMode && (
                <div className="p-6 no-print-force bg-slate-900 flex justify-between items-center">
                    <button onClick={onClose} className="text-white"><ArrowLeft /></button>
                    <h2 className="text-white font-bold">Recibo</h2>
                </div>
            )}

            <div className="p-8 pb-40 max-w-2xl mx-auto printable-area relative">
                {isFullyPaid && (
                    <div className="absolute top-40 right-10 border-4 border-red-600 text-red-600 rounded-xl p-2 font-black text-2xl uppercase transform -rotate-12 opacity-80 pointer-events-none z-10 text-center leading-none">
                        PAGADO
                        <span className="block text-[10px] mt-1 text-red-600 font-bold">{lastPaymentDate}</span>
                    </div>
                )}
                <div className="flex justify-center mb-6 mt-4">
                    <img src="/logo.png" alt="Jaison Auto Repair Logo" className="w-32 h-auto object-contain" />
                </div>
                
                {/* --- SECCIÓN DE DIRECCIÓN ACTUALIZADA --- */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black mb-2">JAISON AUTO REPAIR</h1>
                    <div className="text-xs font-medium text-slate-600 space-y-1">
                        <p className="font-bold text-slate-800 uppercase tracking-wide">Carretera 125, Ave. Emérito Estrada Rivera</p>
                        <p>KM. 19.7, Bo. Piedras Blancas</p>
                        <p>San Sebastián, PR 00685 • Detrás del Garaje Mobil</p>
                        <div className="flex justify-center gap-4 mt-2 pt-2 border-t border-slate-200 w-fit mx-auto">
                            <p className="font-bold">📞 +1 (540) 257-2965</p>
                            <p className="font-bold">✉️ jaisonautorepair26@gmail.com</p>
                        </div>
                    </div>
                </div>

                <div className="border-y-2 border-slate-900 py-4 mb-6 flex justify-between">
                    <div>
                        <p className="font-bold">{client?.name}</p>
                        <p className="text-sm">{vehicle?.brand} {vehicle?.model} ({vehicle?.year})</p>
                        <p className="text-sm font-mono">TAB: {vehicle?.plate}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold">ORDEN #{order.id.slice(-6)}</p>
                        <p className="text-sm">{new Date(order.entryDate).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="mb-8">
                    <p className="font-bold text-xs uppercase mb-2">Servicios:</p>
                    {order.items.length === 0 ? <p className="text-sm italic text-slate-500">Mano de obra y revisión general</p> : order.items.map((i: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm py-1 border-b border-slate-100">
                            <span>{i.description}</span>
                            <span>${i.price.toFixed(2)}</span>
                        </div>
                    ))}
                    {order.description && <div className="mt-4 p-4 bg-slate-100 rounded text-sm"><span className="font-bold">Reporte del Cliente:</span> {order.description}</div>}
                    {order.servicePerformedNotes && <div className="mt-2 p-4 bg-slate-100 rounded text-sm"><span className="font-bold">Trabajo Realizado:</span> {order.servicePerformedNotes}</div>}
                </div>
                <div className="border-t-4 border-slate-900 pt-4 text-right">
                    <div className="flex justify-between text-sm"><span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
                    {order.applyIVU && <div className="flex justify-between text-sm"><span>IVU (11.5%)</span><span>${order.tax.toFixed(2)}</span></div>}
                    <div className="flex justify-between text-xl font-black mt-2 mb-4"><span>TOTAL</span><span>${order.total.toFixed(2)}</span></div>
                    {order.payments && order.payments.length > 0 && (
                        <div className="border-t border-dashed border-slate-300 pt-2 mt-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase text-left mb-1">Historial de Pagos:</p>
                            {order.payments.map((p: any) => (
                                <div key={p.id} className="flex justify-between text-xs text-slate-600 mb-1"><span>{new Date(p.date).toLocaleDateString()} - {p.method}</span><span>-${p.amount.toFixed(2)}</span></div>
                            ))}
                            <div className="flex justify-between text-sm font-bold text-slate-900 mt-2 border-t border-slate-200 pt-1"><span>Total Pagado</span><span>${totalPaid.toFixed(2)}</span></div>
                            {!isFullyPaid && <div className="flex justify-between text-lg font-black text-red-600 mt-1"><span>DEUDA PENDIENTE</span><span>${remainingBalance.toFixed(2)}</span></div>}
                        </div>
                    )}
                </div>
            </div>
            
            {!isSharedMode && (
                <div className="fixed bottom-0 w-full p-4 bg-white border-t flex gap-2 no-print-force overflow-x-auto">
                    <button onClick={() => window.print()} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Printer size={18}/> Print</button>
                    <button onClick={shareWhatsapp} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><WhatsAppIcon /> Whatsapp</button>
                    <button onClick={shareSMS} className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><MessageSquare size={18}/> SMS</button>
                    <button onClick={shareEmail} className="flex-1 bg-slate-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Mail size={18}/> Email</button>
                    <button onClick={copyLink} className="w-12 flex-none bg-slate-200 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><LinkIcon size={18}/></button>
                </div>
            )}
        </div>
    );
};

const Input = ({ label, value, onChange, placeholder, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm outline-none" />
  </div>
);

export default App;