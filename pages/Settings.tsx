import React, { useState, useEffect } from 'react';
import { Save, Bell, Zap, RefreshCw, Gift, Loader2 } from 'lucide-react';
import { getSettings, saveSettings } from '../services/db';
import { useWagmiWallet } from '../hooks/useWagmiWallet';

const Toggle: React.FC<{ label: string; description: string; checked: boolean; onChange: () => void; icon: any }> = ({ 
  label, description, checked, onChange, icon: Icon 
}) => (
  <div className="bg-[#111] border border-gray-800 rounded-2xl p-5 mb-4 flex items-center justify-between group hover:border-gray-700 transition-colors">
    <div className="flex items-start gap-4">
      <div className={`p-3 rounded-full ${checked ? 'bg-neon/10 text-neon' : 'bg-gray-800 text-gray-500'} transition-colors`}>
        <Icon size={20} />
      </div>
      <div>
        <h3 className="font-bold text-white mb-1">{label}</h3>
        <p className="text-xs text-gray-400 max-w-[180px]">{description}</p>
      </div>
    </div>
    <button 
      onClick={onChange}
      className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${checked ? 'bg-neon' : 'bg-gray-700'}`}
    >
      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

const Settings: React.FC = () => {
  const { wallet, connect } = useWagmiWallet();
  const [settings, setSettings] = useState({
    newMints: true,
    airdrops: true,
    updates: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (wallet.connected && wallet.address) {
        setLoading(true);
        getSettings(wallet.address).then(s => {
            setSettings(s);
            setLoading(false);
        });
    }
  }, [wallet.connected, wallet.address]);

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!wallet.connected || !wallet.address) {
        connect();
        return;
    }
    
    setSaving(true);
    const success = await saveSettings(wallet.address, settings);
    setSaving(false);
    
    if (success) {
        setMsg('Preferences saved successfully!');
        setTimeout(() => setMsg(''), 3000);
    } else {
        setMsg('Failed to save.');
    }
  };

  return (
    <div className="pt-20 pb-24 px-4 max-w-md mx-auto min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 tracking-tighter">Settings</h1>
        <p className="text-gray-500 text-sm">Manage your notification preferences</p>
      </div>

      {!wallet.connected ? (
          <div className="flex flex-col items-center justify-center py-20">
              <p className="text-gray-400 mb-4">Connect wallet to manage settings.</p>
              <button onClick={connect} className="bg-white text-black px-6 py-2 rounded-full font-bold">Connect</button>
          </div>
      ) : loading ? (
          <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-neon" />
          </div>
      ) : (
          <>
            <Toggle 
                label="New Mints" 
                description="Get notified when new Phunks are minted"
                checked={settings.newMints} 
                onChange={() => toggleSetting('newMints')}
                icon={Zap}
            />

            <Toggle 
                label="Airdrops" 
                description="Alerts for XP rewards and token drops"
                checked={settings.airdrops} 
                onChange={() => toggleSetting('airdrops')}
                icon={Gift}
            />
            
            <Toggle 
                label="Updates" 
                description="Major protocol changes and news"
                checked={settings.updates} 
                onChange={() => toggleSetting('updates')}
                icon={RefreshCw}
            />

            <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full mt-8 bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? 'Saving...' : 'Save Preferences'}
            </button>
            {msg && <p className="text-center text-neon mt-4 text-sm font-bold">{msg}</p>}
          </>
      )}
    </div>
  );
};

export default Settings;