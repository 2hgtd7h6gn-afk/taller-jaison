import React, { useState, useEffect } from 'react';
import { Wrench, Users, Plus, Calendar, Search, Car, Mail, MessageCircle, ChevronRight, Save, ArrowLeft, Clock, X, FileText, Edit2, Share2, Printer, DollarSign, Trash2, Smartphone, RefreshCw, AlertCircle, CheckSquare, AlertTriangle } from 'lucide-react';

// --- LOGO CONFIGURACIÓN ---
// IMPORTANTE: Usa el placeholder para pruebas. 
// Cuando tengas el archivo 'logo.png' en tu carpeta src, 
// DESCOMENTA la línea 'import' y COMENTA la línea 'const logoImg'.

// import logoImg from './logo.png'; 
const logoImg = "https://placehold.co/400x400/111827/ffffff?text=JAISON+LOGO";

// --- CONFIGURACIÓN DE CONEXIÓN ---
// Pega aquí la URL de tu Google Apps Script desplegado como Aplicación Web.
const API_URL = ""; 

// --- ESTILOS PARA IMPRESIÓN ---
const PrintStyles = () => (
  <style>{`
    @media print {
      body * { visibility: hidden; }
      .printable-area, .printable-area * { visibility: visible; }
      .printable-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; background: white; color: black; }
      .no-print { display: none !important; }
    }
  `}</style>
);

// --- COMPONENTES UI SIMPLES ---

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2 no-print disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-slate-900 text-white shadow-lg shadow-slate-300",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    outline: "border-2 border-slate-900 text-slate-900",
    danger: "bg-red-50 text-red-600 border border-red-100",
    success: "bg-green-600 text-white shadow-lg shadow-green-200",
    warning: "bg-orange-100 text-orange-700"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 ${className} ${onClick ? 'cursor-pointer transition-colors' : ''}`}>
    {children}
  </div>
);

const Input = ({ label, value, onChange, placeholder, type = "text", maxLength, prefix, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
    <div className="relative">
        {prefix && <div className="absolute left-3 top-3 text-gray-500 font-medium">{prefix}</div>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength} className={`w-full p-3 rounded-xl border border-gray-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 outline-none transition-all ${prefix ? 'pl-8' : ''}`} />
    </div>
  </div>
);

// --- UTILIDADES ---
const formatTablilla = (value) => {
  let val = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (val.length > 6) val = val.slice(0, 6);
  if (val.length > 3) val = val.slice(0, 3) + '-' + val.slice(3);
  return val;
};

// --- SERVICIO DE API ---
const apiService = {
    fetchData: async () => {
        if (!API_URL) return null;
        try {
            const response = await fetch(API_URL);
            const json = await response.json();
            return json.status === 'success' ? json.data : null;
        } catch (e) {
            console.error("Error fetching data", e);
            return null;
        }
    },
    saveData: async (clients) => {
        if (!API_URL) return true; 
        try {
            await fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: "SAVE_ALL", clients: clients })
            });
            return true;
        } catch (e) {
            console.error("Error saving data", e);
            return false;
        }
    }
};

// --- VISTAS ---

const ReceiptView = ({ service, setView }) => {
    if (!service) return null;

    const handlePrint = () => window.print();

    const generateShareText = () => {
        return `Hola ${service.clientName}, recibo de servicio en JAISON AUTO REPAIR.\n\nVehículo: ${service.vehicleInfo}\nServicio: ${service.type}\nFecha: ${service.date}\nTotal: $${service.cost}\n\nGracias por su preferencia.`;
    };

    const shareWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(generateShareText())}`, '_blank');
    };

    const shareEmail = () => {
        const subject = `Recibo de Servicio - ${service.date}`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(generateShareText())}`, '_blank');
    };

    const shareSMS = () => {
        const ua = navigator.userAgent.toLowerCase();
        const separator = (ua.indexOf("iphone") > -1 || ua.indexOf("ipad") > -1) ? "&" : "?";
        window.open(`sms:${separator}body=${encodeURIComponent(generateShareText())}`, '_blank');
    };

    // Verificar si hay reporte de inspección
    const hasInspection = service.inspection && (
        service.inspection.dents || service.inspection.scratches || 
        service.inspection.glass || service.inspection.lights || 
        service.inspection.interior || service.inspection.notes
    );

    return (
        <div className="pb-20">
            <PrintStyles />
            <div className="flex items-center gap-2 mb-6 no-print">
                <button onClick={() => setView('serviceDetail')} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeft size={20} /></button>
                <h2 className="text-xl font-bold">Recibo de Servicio</h2>
            </div>

            <div className="printable-area bg-white p-6 rounded-none md:rounded-2xl shadow-none md:shadow-md border border-gray-100 mb-6">
                <div className="text-center border-b-2 border-slate-900 pb-6 mb-6">
                    {/* LOGO IMPORTADO */}
                    <div className="flex justify-center mb-4">
                         <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden">
                            <img src={logoImg} alt="Jaison Auto Repair Logo" className="w-full h-full object-cover" />
                         </div>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase">Jaison Auto Repair</h1>
                    <p className="text-sm font-bold text-red-600 uppercase tracking-widest mb-2">& Air Conditioning</p>
                    <p className="text-gray-500 text-xs">540-257-2965</p>
                    <p className="text-gray-500 text-xs">San Juan, Puerto Rico</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div><p className="text-gray-400 text-xs uppercase font-bold">Cliente</p><p className="font-bold text-gray-800">{service.clientName}</p></div>
                    <div className="text-right"><p className="text-gray-400 text-xs uppercase font-bold">Fecha</p><p className="font-bold text-gray-800">{service.date}</p></div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg mb-6 border border-gray-100">
                    <p className="text-gray-400 text-xs uppercase font-bold mb-1">Vehículo</p>
                    <p className="font-medium text-gray-800">{service.vehicleInfo || 'No especificado'}</p>
                    <p className="text-xs text-gray-500 mt-1">Millaje: {service.mileage || 'N/A'}</p>
                </div>

                <div className="mb-8">
                    <p className="text-gray-400 text-xs uppercase font-bold mb-2 border-b border-gray-100 pb-1">Descripción</p>
                    {service.items && service.items.length > 0 ? (
                        <table className="w-full text-sm">
                            <tbody>{service.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-50 last:border-0">
                                    <td className="py-2 text-gray-800 font-medium">{item.description}</td>
                                    <td className="py-2 text-right text-gray-800">${parseFloat(item.price).toFixed(2)}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    ) : (
                        <div className="flex justify-between items-start mb-2"><span className="font-bold text-gray-800 w-3/4">{service.type}</span><span className="font-bold text-slate-900">${service.cost || '0.00'}</span></div>
                    )}
                </div>

                {/* Sección de Inspección de Entrada en el Recibo */}
                {hasInspection && (
                    <div className="mb-8 p-3 border border-gray-300 rounded bg-gray-50">
                        <p className="text-xs font-bold text-slate-700 uppercase mb-2">Condición de Recepción del Vehículo</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {service.inspection.dents && <span className="text-[10px] bg-white border border-gray-300 px-2 py-1 rounded">Abolladuras</span>}
                            {service.inspection.scratches && <span className="text-[10px] bg-white border border-gray-300 px-2 py-1 rounded">Rayazos</span>}
                            {service.inspection.glass && <span className="text-[10px] bg-white border border-gray-300 px-2 py-1 rounded">Cristales Rotos</span>}
                            {service.inspection.lights && <span className="text-[10px] bg-white border border-gray-300 px-2 py-1 rounded">Focos Rotos</span>}
                            {service.inspection.interior && <span className="text-[10px] bg-white border border-gray-300 px-2 py-1 rounded">Interiores Dañados</span>}
                        </div>
                        {service.inspection.notes && <p className="text-xs text-gray-600 italic">Notas: {service.inspection.notes}</p>}
                        <p className="text-[9px] text-gray-400 mt-2 text-justify">El taller no se hace responsable por los daños pre-existentes listados arriba.</p>
                    </div>
                )}

                <div className="border-t-2 border-slate-900 pt-4">
                    {service.subtotal && (
                        <>
                            <div className="flex justify-between items-center mb-1 text-sm text-gray-600"><span>Subtotal</span><span>${service.subtotal}</span></div>
                            {parseFloat(service.taxAmount) > 0 && <div className="flex justify-between items-center mb-2 text-sm text-gray-600"><span>IVU (11.5%)</span><span>${service.taxAmount}</span></div>}
                        </>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <span className="text-xl font-bold text-gray-800">TOTAL</span>
                        <span className="text-3xl font-black text-slate-900">${service.cost || '0.00'}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-3 no-print">
                <Button onClick={handlePrint} className="w-full" variant="primary"><Printer size={20} /> Imprimir / PDF</Button>
                <div className="grid grid-cols-3 gap-2">
                    <Button onClick={shareWhatsApp} variant="success" className="bg-green-600 text-xs px-2"><MessageCircle size={18} /> WhatsApp</Button>
                    <Button onClick={shareSMS} variant="secondary" className="text-xs px-2"><Smartphone size={18} /> SMS</Button>
                    <Button onClick={shareEmail} variant="secondary" className="text-xs px-2"><Mail size={18} /> Email</Button>
                </div>
            </div>
        </div>
    );
};

const Dashboard = ({ clients, setView, setSelectedService, isSyncing, syncData }) => (
  <div className="space-y-6 pb-20">
    <header className="flex justify-between items-center mb-6 pt-2">
      <div>
        <h1 className="text-2xl font-black text-slate-900 leading-none tracking-tight">JAISON</h1>
        <h2 className="text-lg font-bold text-slate-700 leading-none">AUTO REPAIR</h2>
        <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] font-bold text-red-600 tracking-widest uppercase">& Air Conditioning</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 items-end">
        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border-4 border-gray-200 shadow-lg overflow-hidden shrink-0">
            {/* Si subes el archivo logo.png, cambia el src a "/logo.png" */}
            <img 
                src={logoImg} 
                alt="Logo Jaison Auto Repair" 
                className="w-full h-full object-cover opacity-90"
            />
        </div>
        {!API_URL && <div className="text-[9px] text-red-500 font-bold bg-red-100 px-2 py-1 rounded">Modo Demo</div>}
        {API_URL && (
            <button onClick={syncData} className={`text-xs flex items-center gap-1 ${isSyncing ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`}>
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Sincronizando...' : 'Actualizar'}
            </button>
        )}
      </div>
    </header>

    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-slate-800 text-white border-none relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-10"><Wrench size={60} /></div>
        <h3 className="text-slate-300 text-xs font-medium uppercase tracking-wider">Servicios</h3>
        <p className="text-3xl font-bold mt-1">{clients.flatMap(c => c.history).length}</p>
      </Card>
      <Card>
        <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider">Clientes</h3>
        <p className="text-3xl font-bold mt-1 text-slate-800">{clients.length}</p>
      </Card>
    </div>

    <div className="flex justify-between items-center mt-6 mb-4">
      <h2 className="text-lg font-bold text-gray-800">Servicios Recientes</h2>
      <button onClick={() => setView('clients')} className="text-blue-600 text-sm font-medium">Ver todos</button>
    </div>

    <div className="space-y-3">
      {clients.flatMap(c => c.history.map(h => ({...h, clientName: c.name, clientId: c.id}))).slice(0, 3).map((service, idx) => (
        <Card key={idx} className="flex flex-row items-center justify-between p-3 hover:bg-slate-50 active:scale-[0.98] transition-all border border-transparent hover:border-slate-200 group" onClick={() => { setSelectedService(service); setView('serviceDetail'); }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-white group-hover:text-blue-600 transition-colors"><Clock size={18} /></div>
            <div>
              <p className="font-bold text-gray-800 group-hover:text-slate-700 transition-colors line-clamp-1">{service.clientName}</p>
              <p className="text-xs text-gray-500 line-clamp-1">{service.type}</p>
              <p className="text-[10px] text-gray-400">{service.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">${service.cost || '0'}</span>
              <ChevronRight size={18} className="text-gray-300 group-hover:text-slate-400" />
          </div>
        </Card>
      ))}
      {clients.flatMap(c => c.history).length === 0 && <div className="text-center py-8 text-gray-400">No hay servicios recientes</div>}
    </div>

    <Button onClick={() => setView('addService')} className="w-full mt-4 shadow-xl shadow-slate-200"><Plus size={20} /> Nuevo Servicio</Button>
  </div>
);

const ServiceDetail = ({ service, setView }) => {
  if (!service) return null;
  // Verificar si hay reporte de inspección
  const hasInspection = service.inspection && (
    service.inspection.dents || service.inspection.scratches || 
    service.inspection.glass || service.inspection.lights || 
    service.inspection.interior || service.inspection.notes
  );

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
            <button onClick={() => setView('dashboard')} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeft size={20} /></button>
            <h2 className="text-xl font-bold">Detalles del Servicio</h2>
        </div>
        <button onClick={() => setView('editService')} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"><Edit2 size={18} /></button>
      </div>
      <Card className="mb-6 border-t-4 border-t-slate-800 shadow-md">
         <div className="flex justify-between items-start mb-6">
            <div className="flex-1 pr-4"><p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Servicio Principal</p><h3 className="text-xl font-bold text-gray-900 leading-tight">{service.type}</h3></div>
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-800 shrink-0"><Wrench size={24} /></div>
         </div>
         <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar size={12}/> Fecha</p><p className="font-semibold text-gray-800">{service.date}</p></div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock size={12}/> Millaje</p><p className="font-semibold text-gray-800">{service.mileage || 'N/A'}</p></div>
         </div>
         {service.vehicleInfo && <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-6"><p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Car size={12}/> Vehículo</p><p className="font-semibold text-gray-800">{service.vehicleInfo}</p></div>}
         {service.items && service.items.length > 0 && (
             <div className="mb-6">
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Desglose</p>
                 <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                     {service.items.map((item, idx) => (
                         <div key={idx} className="flex justify-between p-3 border-b border-gray-200 last:border-0"><span className="text-sm text-gray-700">{item.description}</span><span className="text-sm font-bold text-gray-900">${parseFloat(item.price).toFixed(2)}</span></div>
                     ))}
                 </div>
             </div>
         )}
         <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-6">
             {service.subtotal && (
                 <div className="space-y-1 mb-2 border-b border-green-200 pb-2">
                    <div className="flex justify-between text-xs text-green-700"><span>Subtotal</span><span>${service.subtotal}</span></div>
                    {parseFloat(service.taxAmount) > 0 && <div className="flex justify-between text-xs text-green-700"><span>IVU (11.5%)</span><span>${service.taxAmount}</span></div>}
                 </div>
             )}
             <div className="flex justify-between items-center"><div><p className="text-xs text-green-700 font-bold uppercase mb-1">Costo Total</p><p className="text-2xl font-black text-green-800">${service.cost || '0.00'}</p></div><div className="bg-green-200 p-2 rounded-full text-green-800"><DollarSign size={20} /></div></div>
         </div>
         
         {/* Alerta de Inspección */}
         {hasInspection && (
             <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
                 <div className="flex items-center gap-2 mb-2 text-red-700">
                     <AlertTriangle size={18} />
                     <p className="text-sm font-bold uppercase">Daños Pre-existentes Reportados</p>
                 </div>
                 <ul className="list-disc list-inside text-sm text-gray-700 mb-2 pl-2">
                     {service.inspection.dents && <li>Abolladuras/Golpes</li>}
                     {service.inspection.scratches && <li>Rayazos</li>}
                     {service.inspection.glass && <li>Cristales Rotos</li>}
                     {service.inspection.lights && <li>Focos Dañados</li>}
                     {service.inspection.interior && <li>Interiores Dañados</li>}
                 </ul>
                 {service.inspection.notes && <p className="text-sm text-gray-600 bg-white p-2 rounded border border-red-100">"{service.inspection.notes}"</p>}
             </div>
         )}

         <div className="border-t border-gray-100 pt-4"><p className="text-xs text-gray-400 mb-1">Cliente</p><p className="font-medium text-gray-800 flex items-center gap-2"><Users size={16} className="text-gray-400"/> {service.clientName}</p></div>
      </Card>
      <h3 className="font-bold text-gray-800 mb-3 px-1 flex items-center gap-2"><FileText size={18} /> Notas del Mecánico</h3>
      <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-100 text-gray-700 shadow-sm relative overflow-hidden mb-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-200"></div>
        <p className="whitespace-pre-wrap leading-relaxed">{service.notes ? service.notes : <span className="text-gray-400 italic">No se agregaron notas.</span>}</p>
      </div>
      <Button onClick={() => setView('receipt')} variant="outline" className="w-full border-2"><FileText size={20} /> Ver Recibo / Factura</Button>
    </div>
  );
};

// ... ClientList, ClientDetail, EditClientForm, AddVehicleForm, EditServiceForm se mantienen iguales ...
// ... Aquí incluyo las versiones compactas de los formularios clave que necesitan manejar el state global

const ClientList = ({ clients, setView, setSelectedClient, searchTerm, setSearchTerm }) => (
  <div className="pb-20">
    <div className="sticky top-0 bg-gray-50 pt-2 pb-4 z-10">
      <div className="flex items-center gap-2 mb-4"><button onClick={() => setView('dashboard')} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeft size={20} /></button><h2 className="text-xl font-bold">Clientes</h2></div>
      <div className="relative"><Search className="absolute left-3 top-3.5 text-gray-400" size={18} /><input type="text" placeholder="Buscar por nombre o tablilla..." className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-white shadow-sm focus:ring-2 focus:ring-slate-100 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
    </div>
    <div className="space-y-3">
      {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.vehicles.some(v => v.plate.toLowerCase().includes(searchTerm.toLowerCase()))).map(client => (
        <Card key={client.id} className="active:scale-[0.98] transition-transform cursor-pointer" onClick={() => { setSelectedClient(client); setView('clientDetail'); }}>
          <div className="flex justify-between items-start">
            <div><h3 className="font-bold text-gray-800 text-lg">{client.name}</h3><div className="flex items-center gap-2 text-gray-500 text-sm mt-1"><Car size={14} /><span>{client.vehicles[0]?.make} {client.vehicles[0]?.model}</span><span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-600 font-mono">{client.vehicles[0]?.plate}</span></div></div><ChevronRight className="text-gray-300" />
          </div>
        </Card>
      ))}
    </div>
    <button onClick={() => setView('addClient')} className="fixed bottom-24 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-lg shadow-slate-300 flex items-center justify-center hover:bg-slate-800 transition-colors"><Plus size={28} /></button>
  </div>
);

const ClientDetail = ({ selectedClient, setView }) => {
  if (!selectedClient) return null;
  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><button onClick={() => setView('clients')} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeft size={20} /></button><h2 className="text-xl font-bold">Detalles del Cliente</h2></div>
        <button onClick={() => setView('editClient')} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"><Edit2 size={18} /></button>
      </div>
      <Card className="mb-6 border-l-4 border-l-slate-800">
        <h3 className="text-2xl font-bold text-gray-800">{selectedClient.name}</h3>
        <p className="text-gray-500 text-sm mb-3">{selectedClient.phone}</p>
        <div className="flex gap-3 mt-4">
          <a href={`tel:${selectedClient.phone}`} className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg flex items-center justify-center gap-2 font-medium text-sm"><MessageCircle size={16} /> Llamar</a>
          <a href={`mailto:${selectedClient.email}`} className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-lg flex items-center justify-center gap-2 font-medium text-sm"><Mail size={16} /> Email</a>
        </div>
      </Card>
      <div className="flex justify-between items-center mb-3 px-1"><h3 className="font-bold text-gray-800">Vehículos</h3><button onClick={() => setView('addVehicle')} className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus size={14} /> Agregar</button></div>
      <div className="space-y-3 mb-6">
        {selectedClient.vehicles.map((v, i) => (
            <div key={v.id} className="bg-white p-3 rounded-xl border border-gray-200 flex justify-between items-center"><div className="flex items-center gap-3"><div className="bg-gray-100 p-2 rounded-lg text-gray-500"><Car size={20} /></div><div><p className="font-bold text-gray-800 text-sm">{v.make} {v.model} {v.year}</p><p className="text-xs text-gray-500 font-mono tracking-wider">{v.plate} {v.color && ` • ${v.color}`}</p></div></div></div>
        ))}
      </div>
      <h3 className="font-bold text-gray-800 mb-3 px-1">Historial</h3>
      <div className="space-y-4">
        {selectedClient.history.length > 0 ? (
          selectedClient.history.map((service, idx) => (
            <div key={idx} className="relative pl-6 border-l-2 border-gray-200 pb-6 last:pb-0">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-600 ring-4 ring-white"></div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 -mt-1"><div className="flex justify-between items-start mb-1"><span className="font-bold text-gray-800">{service.type}</span><span className="text-xs text-gray-400">{service.date}</span></div><p className="text-sm text-gray-600 mb-2">{service.notes}</p><div className="flex justify-between items-center mt-2"><div className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-500 font-mono">Millas: {service.mileage}</div><span className="text-green-700 font-bold text-sm">${service.cost || '0'}</span></div></div>
            </div>
          ))
        ) : (<div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300"><p className="text-gray-400">Sin historial registrado</p></div>)}
      </div>
    </div>
  );
};

const AddServiceForm = ({ clients, setClients, newService, setNewService, setView, lineItems, setLineItems, onSaveData }) => {
  const [useManualInput, setUseManualInput] = useState(false);
  const [currentService, setCurrentService] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [applyTax, setApplyTax] = useState(false);
  
  // Estado para la inspección
  const [showInspection, setShowInspection] = useState(false);
  const [inspectionData, setInspectionData] = useState({
      dents: false, scratches: false, glass: false, lights: false, interior: false, notes: ''
  });

  const clientVehicles = newService.clientId ? clients.find(c => c.id == newService.clientId)?.vehicles || [] : [];
  const commonServices = ["Cambio de Aceite y Filtro", "Lavado de Chasis", "Frenos", "Alineación", "Diagnóstico", "Inspección", "Aire Acondicionado", "Suspensión", "Batería", "Gomas", "Tune-up", "Otro / Manual"];

  const addItem = () => {
    if (!currentService || !currentPrice) return;
    setLineItems([...lineItems, { description: currentService, price: parseFloat(currentPrice) || 0 }]);
    setCurrentService(''); setCurrentPrice(''); setUseManualInput(false);
  };
  const removeItem = (index) => {
    const updated = [...lineItems]; updated.splice(index, 1); setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.price, 0);
  const taxAmount = applyTax ? subtotal * 0.115 : 0;
  const totalCost = (subtotal + taxAmount).toFixed(2);

  const handleAddService = async () => {
    if (!newService.clientId || lineItems.length === 0) { alert("Selecciona cliente y servicios"); return; }
    const updatedClients = clients.map(client => {
      if (client.id === parseInt(newService.clientId)) {
        const selectedVehicle = client.vehicles.find(v => v.id === newService.vehicleId);
        const vehicleInfo = selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.color ? selectedVehicle.color + ' ' : ''}(${selectedVehicle.plate})` : 'Vehículo Principal';
        const serviceTitle = lineItems.map(i => i.description).join(", ");
        return {
          ...client,
          history: [{
            id: `h${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: serviceTitle.length > 30 ? serviceTitle.substring(0, 30) + '...' : serviceTitle,
            notes: newService.notes, 
            mileage: newService.mileage, 
            cost: totalCost, 
            subtotal: subtotal.toFixed(2), 
            taxAmount: taxAmount.toFixed(2), 
            vehicleInfo: vehicleInfo, 
            items: lineItems,
            inspection: inspectionData // Guardar inspección
          }, ...client.history]
        };
      }
      return client;
    });
    setClients(updatedClients);
    await onSaveData(updatedClients);
    setNewService({ clientId: '', vehicleId: '', type: '', notes: '', mileage: '', cost: '' });
    setLineItems([]); setApplyTax(false); setShowInspection(false); setInspectionData({ dents: false, scratches: false, glass: false, lights: false, interior: false, notes: '' });
    setView('dashboard');
    alert("Servicio registrado y guardado");
  };

  const handleServiceTypeChange = (e) => {
    const value = e.target.value;
    if (value === "Otro / Manual") {
      setUseManualInput(true);
      setCurrentService('');
    } else {
      setUseManualInput(false);
      setCurrentService(value);
    }
  };

  return (
    <div className="pb-20">
      <div className="flex items-center gap-2 mb-6"><button onClick={() => setView('dashboard')} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeft size={20} /></button><h2 className="text-xl font-bold">Registrar Servicio</h2></div>
      <Card>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">Cliente</label>
          <select className="w-full p-3 rounded-xl border border-gray-200 bg-white" value={newService.clientId} onChange={(e) => e.target.value === 'new_client_action' ? setView('addClientFromService') : setNewService({...newService, clientId: e.target.value, vehicleId: ''})}>
            <option value="">Seleccionar Cliente</option><option value="new_client_action" className="font-bold text-blue-600">+ Crear Nuevo Cliente</option>
            {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        {clientVehicles.length > 0 && <div className="mb-4"><label className="block text-sm font-medium text-gray-600 mb-1">Vehículo</label><select className="w-full p-3 rounded-xl border border-gray-200 bg-white" value={newService.vehicleId} onChange={(e) => setNewService({...newService, vehicleId: e.target.value})}><option value="">Seleccionar Vehículo...</option>{clientVehicles.map(v => (<option key={v.id} value={v.id}>{v.make} {v.model} - {v.plate}</option>))}</select></div>}
        
        {/* SECCIÓN DE INSPECCIÓN DE ENTRADA */}
        <div className="mb-6 border rounded-xl overflow-hidden border-gray-200">
            <button onClick={() => setShowInspection(!showInspection)} className="w-full flex justify-between items-center p-3 bg-gray-50 text-left">
                <span className="font-bold text-slate-700 flex items-center gap-2"><AlertTriangle size={16} className="text-orange-500" /> Inspección de Entrada</span>
                <ChevronRight size={18} className={`transition-transform text-gray-400 ${showInspection ? 'rotate-90' : ''}`} />
            </button>
            {showInspection && (
                <div className="p-3 bg-white">
                    <p className="text-xs text-gray-500 mb-3">Marque condiciones pre-existentes:</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={inspectionData.dents} onChange={e => setInspectionData({...inspectionData, dents: e.target.checked})} className="rounded text-red-500 focus:ring-red-500" /> Abolladuras</label>
                        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={inspectionData.scratches} onChange={e => setInspectionData({...inspectionData, scratches: e.target.checked})} className="rounded text-red-500 focus:ring-red-500" /> Rayazos</label>
                        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={inspectionData.glass} onChange={e => setInspectionData({...inspectionData, glass: e.target.checked})} className="rounded text-red-500 focus:ring-red-500" /> Cristales Rotos</label>
                        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={inspectionData.lights} onChange={e => setInspectionData({...inspectionData, lights: e.target.checked})} className="rounded text-red-500 focus:ring-red-500" /> Focos Rotos</label>
                        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={inspectionData.interior} onChange={e => setInspectionData({...inspectionData, interior: e.target.checked})} className="rounded text-red-500 focus:ring-red-500" /> Interiores Malos</label>
                    </div>
                    <textarea className="w-full p-2 border rounded text-sm h-20" placeholder="Detalles de daños (ej: golpe en puerta trasera)..." value={inspectionData.notes} onChange={e => setInspectionData({...inspectionData, notes: e.target.value})}></textarea>
                </div>
            )}
        </div>

        <div className="mb-4"><label className="block text-sm font-bold text-slate-800 mb-1">Agregar Servicios</label><div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><div className="mb-2">{!useManualInput ? (<select className="w-full p-3 rounded-xl border border-gray-200 bg-white mb-2" value={commonServices.includes(currentService) ? currentService : ""} onChange={handleServiceTypeChange}><option value="">Seleccionar Tipo...</option>{commonServices.map((svc, i) => (<option key={i} value={svc}>{svc}</option>))}</select>) : (<div className="flex gap-2 mb-2"><input type="text" value={currentService} onChange={(e) => setCurrentService(e.target.value)} placeholder="Descripción..." className="flex-1 p-3 rounded-xl border border-gray-200" /><button onClick={() => { setUseManualInput(false); setCurrentService(''); }} className="p-3 bg-white border border-gray-200 rounded-xl"><X size={20} /></button></div>)}</div><div className="flex gap-2"><div className="relative flex-1"><div className="absolute left-3 top-3 text-gray-500 font-medium">$</div><input type="number" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} placeholder="0.00" className="w-full p-3 pl-8 rounded-xl border border-gray-200" /></div><Button onClick={addItem} variant="secondary" className="bg-slate-200 hover:bg-slate-300"><Plus size={20} /></Button></div></div></div>
        {lineItems.length > 0 && (
            <div className="mb-4"><p className="text-xs font-bold text-gray-400 uppercase mb-2">Resumen</p><div className="border rounded-xl overflow-hidden">{lineItems.map((item, idx) => (<div key={idx} className="flex justify-between items-center p-3 border-b bg-white last:border-0"><div><p className="font-medium text-sm text-gray-800">{item.description}</p></div><div className="flex items-center gap-3"><span className="font-bold text-sm text-gray-800">${item.price.toFixed(2)}</span><button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button></div></div>))}<div className="p-3 bg-slate-50 border-t border-gray-200"><div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-600">Subtotal</span><span className="font-bold text-gray-800">${subtotal.toFixed(2)}</span></div><div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2"><input type="checkbox" checked={applyTax} onChange={(e) => setApplyTax(e.target.checked)} className="w-4 h-4" /><label className="text-sm text-gray-700">Aplicar IVU (11.5%)</label></div>{applyTax && <span className="font-medium text-gray-600">${taxAmount.toFixed(2)}</span>}</div><div className="flex justify-between items-center pt-2 border-t border-gray-300 mt-2"><span className="font-bold text-slate-800">TOTAL</span><span className="font-black text-xl text-slate-900">${totalCost}</span></div></div></div></div>
        )}
        <Input label="Millaje Actual" value={newService.mileage} onChange={(e) => setNewService({...newService, mileage: e.target.value})} placeholder="Ej: 55000" type="number" />
        <div className="mb-6"><label className="block text-sm font-medium text-gray-600 mb-1">Notas Generales</label><textarea className="w-full p-3 rounded-xl border border-gray-200 focus:border-slate-500 outline-none h-24 resize-none" value={newService.notes} onChange={(e) => setNewService({...newService, notes: e.target.value})}></textarea></div>
        <Button onClick={handleAddService} className="w-full" disabled={lineItems.length === 0}><Save size={18} /> Guardar Orden</Button>
      </Card>
    </div>
  );
};

const AddClientForm = ({ clients, setClients, newClient, setNewClient, setView, customSuccess, onSaveData }) => {
  const handleAddClient = async () => {
    const id = Date.now();
    const newClientData = {
      id, name: newClient.name, phone: newClient.phone, email: newClient.email,
      vehicles: [{ id: `v${Date.now()}`, make: newClient.carMake, model: newClient.carModel, year: newClient.carYear, plate: newClient.carPlate, color: newClient.carColor }],
      history: []
    };
    const updated = [...clients, newClientData];
    setClients(updated);
    await onSaveData(updated);
    setNewClient({ name: '', phone: '', email: '', carMake: '', carModel: '', carYear: '', carPlate: '', carColor: '' });
    if (customSuccess) customSuccess(id); else setView('clients');
  };
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); if (value.length > 10) value = value.slice(0, 10);
    let fv = ''; if (value.length > 0) fv = `(${value.slice(0, 3)}`; if (value.length > 3) fv += `)${value.slice(3, 6)}`; if (value.length > 6) fv += `-${value.slice(6)}`;
    setNewClient({...newClient, phone: fv});
  };
  return (
    <div className="pb-20">
      <div className="flex items-center gap-2 mb-6"><button onClick={() => customSuccess ? setView('addService') : setView('clients')} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeft size={20} /></button><h2 className="text-xl font-bold">Nuevo Cliente</h2></div>
      <Card>
        <Input label="Nombre Completo" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
        <Input label="Teléfono" value={newClient.phone} onChange={handlePhoneChange} placeholder="(787)..." type="tel" />
        <Input label="Email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
        <div className="border-t border-gray-100 my-4"></div>
        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">Vehículo Principal</h3>
        <div className="grid grid-cols-2 gap-3"><Input label="Marca" value={newClient.carMake} onChange={e => setNewClient({...newClient, carMake: e.target.value})} /><Input label="Modelo" value={newClient.carModel} onChange={e => setNewClient({...newClient, carModel: e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-3"><Input label="Año" value={newClient.carYear} onChange={e => setNewClient({...newClient, carYear: e.target.value})} /><Input label="Tablilla" value={newClient.carPlate} onChange={e => setNewClient({...newClient, carPlate: formatTablilla(e.target.value)})} /></div>
        <Input label="Color" value={newClient.carColor} onChange={e => setNewClient({...newClient, carColor: e.target.value})} placeholder="Ej: Blanco" />
        <Button onClick={handleAddClient} className="w-full mt-4"><Save size={18} /> Guardar Cliente</Button>
      </Card>
    </div>
  );
};

const EditServiceForm = ({ service, clients, setClients, setView, setSelectedService, onSaveData }) => {
    const [mileage, setMileage] = useState('');
    const [notes, setNotes] = useState('');
    const [lineItems, setLineItems] = useState([]);
    const [applyTax, setApplyTax] = useState(false);
    const [currentService, setCurrentService] = useState('');
    const [currentPrice, setCurrentPrice] = useState('');
    const [useManualInput, setUseManualInput] = useState(false);
    const commonServices = ["Cambio de Aceite y Filtro", "Lavado de Chasis", "Frenos", "Alineación", "Diagnóstico", "Inspección", "Aire Acondicionado", "Suspensión", "Batería", "Gomas", "Tune-up", "Otro / Manual"];

    useEffect(() => {
        if (service) {
            setMileage(service.mileage || ''); setNotes(service.notes || ''); setApplyTax(parseFloat(service.taxAmount) > 0);
            if (service.items && service.items.length > 0) setLineItems(service.items);
            else setLineItems([{ description: service.type, price: parseFloat(service.cost) || 0 }]);
        }
    }, [service]);

    const addItem = () => { if(currentService && currentPrice) { setLineItems([...lineItems, {description:currentService, price: parseFloat(currentPrice)}]); setCurrentService(''); setCurrentPrice(''); }};
    const removeItem = (i) => { const u = [...lineItems]; u.splice(i,1); setLineItems(u); };
    const subtotal = lineItems.reduce((sum, i) => sum + i.price, 0);
    const taxAmount = applyTax ? subtotal * 0.115 : 0;
    const totalCost = (subtotal + taxAmount).toFixed(2);

    const handleSave = async () => {
        const serviceTitle = lineItems.map(i => i.description).join(", ");
        const updatedServiceData = { ...service, type: serviceTitle.substring(0,30)+'...', notes, mileage, cost: totalCost, subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), items: lineItems };
        const updatedClients = clients.map(c => {
            if (c.id === service.clientId || c.name === service.clientName) { return { ...c, history: c.history.map(h => h.id === service.id ? updatedServiceData : h) }; } return c;
        });
        setClients(updatedClients);
        await onSaveData(updatedClients);
        setSelectedService(updatedServiceData);
        setView('serviceDetail');
    };

    const handleServiceTypeChange = (e) => {
        const value = e.target.value;
        if (value === "Otro / Manual") {
            setUseManualInput(true);
            setCurrentService('');
        } else {
            setUseManualInput(false);
            setCurrentService(value);
        }
    };

    return (
        <div className="pb-20">
            <div className="flex items-center gap-2 mb-6"><button onClick={() => setView('serviceDetail')} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeft size={20} /></button><h2 className="text-xl font-bold">Editar Orden</h2></div>
            <Card>
                <div className="mb-4 bg-slate-50 p-3 rounded-xl"><div className="flex gap-2 mb-2"><div className="flex-1"><label className="block text-xs font-bold text-gray-500 mb-1">Servicio</label>{!useManualInput ? (<select className="w-full p-2 border rounded bg-white" value={commonServices.includes(currentService) ? currentService : ""} onChange={handleServiceTypeChange}><option value="">Seleccionar...</option>{commonServices.map((svc, i) => (<option key={i} value={svc}>{svc}</option>))}</select>) : (<div className="flex gap-2"><input className="flex-1 p-2 border rounded" placeholder="Descripción..." value={currentService} onChange={e=>setCurrentService(e.target.value)} /><button onClick={() => { setUseManualInput(false); setCurrentService(''); }} className="p-2 bg-white border rounded"><X size={16} /></button></div>)}</div></div><div className="flex gap-2"><div className="relative flex-1"><div className="absolute left-3 top-3 text-gray-500 font-medium">$</div><input className="w-full p-3 pl-8 border rounded-xl" type="number" placeholder="0.00" value={currentPrice} onChange={e=>setCurrentPrice(e.target.value)} /></div><button onClick={addItem} className="bg-slate-200 p-2 rounded"><Plus size={16}/></button></div></div>
                <div className="mb-4 border rounded p-2">{lineItems.map((i,x)=><div key={x} className="flex justify-between border-b p-2"><span>{i.description}</span><div className="flex gap-2"><span>${i.price}</span><button onClick={()=>removeItem(x)}><Trash2 size={14} className="text-red-500"/></button></div></div>)}</div>
                <div className="flex items-center gap-2 mb-4"><input type="checkbox" checked={applyTax} onChange={e=>setApplyTax(e.target.checked)} /> <label>IVU</label> <span className="font-bold ml-auto">Total: ${totalCost}</span></div>
                <Input label="Millaje" value={mileage} onChange={e=>setMileage(e.target.value)} type="number" />
                <div className="mb-4"><textarea className="w-full border rounded p-2" value={notes} onChange={e=>setNotes(e.target.value)}></textarea></div>
                <Button onClick={handleSave} className="w-full">Guardar Cambios</Button>
            </Card>
        </div>
    );
};

const EditClientForm = ({ selectedClient, clients, setClients, setView, setSelectedClient, onSaveData }) => {
    const [formData, setFormData] = useState({ name: selectedClient.name, phone: selectedClient.phone, email: selectedClient.email });
    const handleSave = async () => {
        const updatedClients = clients.map(c => c.id === selectedClient.id ? { ...c, ...formData } : c);
        setClients(updatedClients); setSelectedClient({...selectedClient, ...formData});
        await onSaveData(updatedClients);
        setView('clientDetail');
    };
    return ( <div className="pb-20"><div className="flex items-center gap-2 mb-6"><button onClick={()=>setView('clientDetail')} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeft size={20}/></button><h2 className="text-xl font-bold">Editar</h2></div><Card><Input label="Nombre" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} /><Input label="Tel" value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})} /><Input label="Email" value={formData.email} onChange={e=>setFormData({...formData, email:e.target.value})} /><Button onClick={handleSave} className="w-full mt-2">Guardar</Button></Card></div>);
};

const AddVehicleForm = ({ selectedClient, clients, setClients, setView, setSelectedClient, onSaveData }) => {
    const [vehicle, setVehicle] = useState({ make: '', model: '', year: '', plate: '', color: '' });
    const handleSave = async () => {
        if(!vehicle.make) return;
        const updatedClients = clients.map(c => c.id === selectedClient.id ? { ...c, vehicles: [...c.vehicles, {...vehicle, id: Date.now()}] } : c);
        const updatedClient = updatedClients.find(c => c.id === selectedClient.id);
        setClients(updatedClients); setSelectedClient(updatedClient);
        await onSaveData(updatedClients);
        setView('clientDetail');
    };
    return (<div className="pb-20"><div className="flex items-center gap-2 mb-6"><button onClick={()=>setView('clientDetail')} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeft size={20}/></button><h2 className="text-xl font-bold">Agregar Vehículo</h2></div><Card><Input label="Marca" value={vehicle.make} onChange={e=>setVehicle({...vehicle, make:e.target.value})} /><Input label="Modelo" value={vehicle.model} onChange={e=>setVehicle({...vehicle, model:e.target.value})} /><Input label="Tablilla" value={vehicle.plate} onChange={e=>setVehicle({...vehicle, plate:formatTablilla(e.target.value)})} /><Input label="Color" value={vehicle.color} onChange={e=>setVehicle({...vehicle, color:e.target.value})} /><Button onClick={handleSave} className="w-full mt-2">Guardar</Button></Card></div>);
};

const BottomNav = ({ view, setView }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-20 pb-safe no-print">
    <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 ${view === 'dashboard' ? 'text-slate-900' : 'text-gray-400'}`}>
      <Wrench size={24} />
      <span className="text-[10px] font-medium">Taller</span>
    </button>
    <button onClick={() => setView('clients')} className={`flex flex-col items-center gap-1 ${['clients', 'clientDetail', 'addClient', 'editClient', 'addVehicle'].includes(view) ? 'text-slate-900' : 'text-gray-400'}`}>
      <Users size={24} />
      <span className="text-[10px] font-medium">Clientes</span>
    </button>
    <button onClick={() => alert("Calendario en desarrollo")} className="flex flex-col items-center gap-1 text-gray-400">
      <Calendar size={24} />
      <span className="text-[10px] font-medium">Citas</span>
    </button>
  </div>
);

// --- APP ---
export default function App() {
  const [view, setView] = useState('dashboard');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lineItems, setLineItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [clients, setClients] = useState([{id: 1, name: "Demo", phone: "", email: "", vehicles: [], history: []}]);

  useEffect(() => { syncData(); }, []);
  const syncData = async () => { if (!API_URL) return; setIsSyncing(true); const d = await apiService.fetchData(); if (d) setClients(d); setIsSyncing(false); };
  const handleSaveData = async (uc) => { setIsSyncing(true); await apiService.saveData(uc); setIsSyncing(false); };

  // States form
  const [newService, setNewService] = useState({ clientId: '', vehicleId: '', type: '', notes: '', mileage: '', cost: '' });
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', carMake: '', carModel: '', carYear: '', carPlate: '', carColor: '' });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 selection:bg-slate-200">
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-2xl overflow-hidden">
        <div className="p-5 h-full overflow-y-auto custom-scrollbar">
          {view === 'dashboard' && <Dashboard clients={clients} setView={setView} setSelectedService={setSelectedService} isSyncing={isSyncing} syncData={syncData} />}
          {view === 'clients' && <ClientList clients={clients} setView={setView} setSelectedClient={setSelectedClient} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
          {view === 'clientDetail' && <ClientDetail selectedClient={selectedClient} setView={setView} />}
          {view === 'serviceDetail' && <ServiceDetail service={selectedService} setView={setView} />}
          {view === 'editService' && <EditServiceForm service={selectedService} clients={clients} setClients={setClients} setView={setView} setSelectedService={setSelectedService} onSaveData={handleSaveData} />}
          {view === 'addService' && <AddServiceForm clients={clients} setClients={setClients} newService={newService} setNewService={setNewService} setView={setView} lineItems={lineItems} setLineItems={setLineItems} onSaveData={handleSaveData} />}
          {view === 'addClient' && <AddClientForm clients={clients} setClients={setClients} newClient={newClient} setNewClient={setNewClient} setView={setView} onSaveData={handleSaveData} />}
          {view === 'addClientFromService' && <AddClientForm clients={clients} setClients={setClients} newClient={newClient} setNewClient={setNewClient} setView={setView} onSaveData={handleSaveData} customSuccess={(id) => { setNewService({...newService, clientId: id, vehicleId: ''}); setView('addService'); }} />}
          {view === 'editClient' && <EditClientForm selectedClient={selectedClient} clients={clients} setClients={setClients} setView={setView} setSelectedClient={setSelectedClient} onSaveData={handleSaveData} />}
          {view === 'addVehicle' && <AddVehicleForm selectedClient={selectedClient} clients={clients} setClients={setClients} setView={setView} setSelectedClient={setSelectedClient} onSaveData={handleSaveData} />}
          {view === 'receipt' && <ReceiptView service={selectedService} setView={setView} />}
        </div>
        <BottomNav view={view} setView={setView} />
      </div>
    </div>
  );
}
