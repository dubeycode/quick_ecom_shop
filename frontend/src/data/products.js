export const PRODUCTS = [
  {
    id: 'air-pods',
    name: 'Air Pods',
    amount: 2499,
    image: '/images/air-pods.jpg',
  },
  {
    id: 'cpu',
    name: 'CPU Processor',
    amount: 15999,
    image: '/images/cpu.jpg',
  },
  {
    id: 'gamecpu',
    name: 'Gaming CPU',
    amount: 28999,
    image: '/images/gamecpu.jpg',
  },
  {
    id: 'ps5',
    name: 'PlayStation 5',
    amount: 49999,
    image: '/images/imagesp5.jpg',
  },
  {
    id: 'macmini',
    name: 'Mac Mini',
    amount: 59999,
    image: '/images/macmini.jpg',
  },
  {
    id: 'macmoniter',
    name: 'Mac Monitor',
    amount: 34999,
    image: '/images/macmoniter.jpg',
  },
];

export function getProductImage(productName) {
  if (!productName) return null;
  const normalized = productName.trim().toLowerCase();
  const match = PRODUCTS.find(
    (p) =>
      p.name.toLowerCase() === normalized ||
      p.id === normalized.replace(/\s+/g, '-')
  );
  return match?.image ?? null;
}
