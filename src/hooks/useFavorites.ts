import { useState, useEffect } from 'react';

export type FavoriteItem = {
  id: string;
  type: 'player' | 'team';
  name: string;
  subtitle: string;
  imageUrl: string;
  url: string;
};

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('sports-intel-favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const toggleFavorite = (item: FavoriteItem) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === item.id && f.type === item.type);
      const updated = exists
        ? prev.filter(f => !(f.id === item.id && f.type === item.type))
        : [...prev, item];
      localStorage.setItem('sports-intel-favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorite = (id: string, type: 'player' | 'team') => {
    return favorites.some(f => f.id === id && f.type === type);
  };

  return { favorites, toggleFavorite, isFavorite };
}