import { useState, useEffect } from 'react';

export type FavoriteItem = { id: string; type: 'player' | 'team'; name: string; subtitle: string; imageUrl: string; url: string; };

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('sports-intel-favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        // 🚀 Si Vite inyectó HTML y corrompió la caché, la limpiamos para salvar la App
        localStorage.removeItem('sports-intel-favorites');
      }
    }
  }, []);

  const toggleFavorite = (item: FavoriteItem) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === item.id && f.type === item.type);
      const updated = exists ? prev.filter(f => !(f.id === item.id && f.type === item.type)) : [...prev, item];
      localStorage.setItem('sports-intel-favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorite = (id: string, type: 'player' | 'team') => favorites.some(f => f.id === id && f.type === type);
  return { favorites, toggleFavorite, isFavorite };
}