import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],       // [{ equipment: EquipmentRead, quantity: number }]
      pickupDate: '',  // YYYY-MM-DD
      returnDate: '',  // YYYY-MM-DD

      addItem: (equipment, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.equipment.id === equipment.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.equipment.id === equipment.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { equipment, quantity }] };
        });
      },

      removeItem: (equipmentId) => {
        set((state) => ({
          items: state.items.filter((i) => i.equipment.id !== equipmentId),
        }));
      },

      updateQuantity: (equipmentId, quantity) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.equipment.id === equipmentId ? { ...i, quantity } : i,
          ),
        }));
      },

      setDates: (pickupDate, returnDate) => set({ pickupDate, returnDate }),

      clearCart: () => set({ items: [], pickupDate: '', returnDate: '' }),

      // Derived helpers — call as functions
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalDays: () => {
        const { pickupDate, returnDate } = get();
        if (!pickupDate || !returnDate) return 0;
        const diff =
          (new Date(returnDate) - new Date(pickupDate)) / (1000 * 60 * 60 * 24);
        return Math.max(0, diff);
      },

      totalAmount: () => {
        const days = get().totalDays();
        return get().items.reduce(
          (sum, i) =>
            sum + parseFloat(i.equipment.unit_price_per_day) * i.quantity * days,
          0,
        );
      },
    }),
    { name: 'labsynch-cart' },
  ),
);

export default useCartStore;
