import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Archive, Image as ImageIcon, Package, Plus, RefreshCw, Search } from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { Badge } from '../../components/ui/Badge';
import { getCloudinaryThumbnail } from '../../lib/imageUpload';
import { getCategories, getItemCatalog, getReceivedOrders } from '../../lib/itemsService';
import { formatFCFA } from '../../types/orders';
import { DORMANT_STATUS_CONFIG } from '../../types/items';
import type { Category, DormantStatus, ItemCatalogEntry, ReceivedOrderOption } from '../../types/items';

export const ItemsList: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ItemCatalogEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<ReceivedOrderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [orderId, setOrderId] = useState('all');
  const [status, setStatus] = useState<'all' | DormantStatus>('all');
  const [showArchived, setShowArchived] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalog, categoryList, orderList] = await Promise.all([
        getItemCatalog(showArchived), getCategories(), getReceivedOrders(),
      ]);
      setItems(catalog);
      setCategories(categoryList);
      setOrders(orderList);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les articles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [showArchived]);

  const filtered = useMemo(() => items.filter((item) => {
    const query = search.trim().toLocaleLowerCase('fr');
    if (query && !`${item.item_name} ${item.item_code}`.toLocaleLowerCase('fr').includes(query)) return false;
    if (categoryId !== 'all' && item.category_id !== categoryId) return false;
    if (orderId !== 'all' && item.order_id !== orderId) return false;
    if (status !== 'all' && item.dormant_status !== status) return false;
    return true;
  }), [items, search, categoryId, orderId, status]);

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '16px 16px 90px', width: '100%' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div><span className="zadri-logo-label">ZADRI LUXE</span><h1 style={{ fontSize: '1.45rem', marginTop: '2px' }}>Articles</h1></div>
        <Link to="/articles/nouveau" className="btn-primary" style={{ width: 'auto', minHeight: '42px', padding: '0 15px', borderRadius: 'var(--radius-pill)' }}>
          <Plus size={18} /> Nouveau
        </Link>
      </header>

      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <Search size={18} style={{ position: 'absolute', left: '13px', top: '15px', color: 'var(--color-text-muted)' }} />
        <input className="zadri-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un article ou un code…" style={{ paddingLeft: '42px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '8px' }}>
        <select className="zadri-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="Filtrer par catégorie">
          <option value="all">Toutes les catégories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select className="zadri-input" value={orderId} onChange={(event) => setOrderId(event.target.value)} aria-label="Filtrer par commande">
          <option value="all">Toutes les commandes</option>
          {orders.map((order) => <option key={order.id} value={order.id}>{order.reference}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '8px' }}>
        {(['all', 'normal', 'watch', 'clearance', 'out_of_stock'] as const).map((value) => (
          <button key={value} type="button" onClick={() => setStatus(value)} style={{
            border: status === value ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
            color: status === value ? '#fff' : 'var(--color-text)', background: status === value ? 'var(--color-primary)' : 'var(--color-surface)',
            borderRadius: 'var(--radius-pill)', padding: '7px 12px', whiteSpace: 'nowrap', cursor: 'pointer',
          }}>
            {value === 'all' ? 'Tous' : DORMANT_STATUS_CONFIG[value].label}
          </button>
        ))}
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
        <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
        <Archive size={14} /> Afficher aussi les articles archivés
      </label>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}><div className="spinner spinner-dark" style={{ margin: '0 auto 12px' }} />Chargement…</div>
      ) : error ? (
        <div className="alert-box alert-danger"><AlertCircle size={18} /><div style={{ flex: 1 }}>{error}</div><button className="btn-link" onClick={() => void load()}><RefreshCw size={15} /> Réessayer</button></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', background: 'var(--color-surface)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-card-lg)', padding: '40px 20px' }}>
          <Package size={40} style={{ color: 'var(--color-text-muted)', marginBottom: '10px' }} />
          <h2 style={{ fontSize: '1rem' }}>Aucun article trouvé</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.83rem', margin: '6px 0 16px' }}>Créez un article à partir d’une commande déjà reçue.</p>
          <Link to="/articles/nouveau" className="btn-primary" style={{ width: 'auto', display: 'inline-flex', padding: '0 18px' }}><Plus size={17} /> Créer un article</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: '12px' }}>
          {filtered.map((item) => {
            const statusConfig = DORMANT_STATUS_CONFIG[item.dormant_status];
            const thumbnail = getCloudinaryThumbnail(item.photo_url, 500);
            return (
              <button key={item.item_id} type="button" onClick={() => navigate(`/articles/${item.item_id}`)} style={{
                padding: 0, textAlign: 'left', overflow: 'hidden', cursor: 'pointer', color: 'inherit',
                border: item.archived_at ? '1px dashed var(--color-border)' : '1px solid var(--color-border)',
                background: 'var(--color-surface)', borderRadius: 'var(--radius-card-lg)', boxShadow: 'var(--shadow-sm)', opacity: item.archived_at ? 0.68 : 1,
              }}>
                <div style={{ height: '145px', background: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {thumbnail ? <img src={thumbnail} alt={item.item_name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={35} color="var(--color-text-muted)" />}
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '7px' }}>
                    <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
                    {item.archived_at && <Badge variant="muted">Archivé</Badge>}
                  </div>
                  <div style={{ color: 'var(--color-primary)', fontSize: '0.66rem', fontWeight: 700 }}>{item.item_code}</div>
                  <h2 style={{ fontSize: '0.92rem', margin: '2px 0 7px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.item_name}</h2>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{formatFCFA(item.list_price)}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.73rem', marginTop: '5px' }}>{item.stock_units} en stock · {item.sold_units} vendu(s)</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.68rem', marginTop: '2px' }}>{item.order_reference}{item.category_name ? ` · ${item.category_name}` : ''}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <BottomNav />
    </div>
  );
};
