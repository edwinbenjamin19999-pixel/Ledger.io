// Inventory management engine (Section 9)

export type StockAlertLevel = 'in_stock' | 'low_stock' | 'critical' | 'out_of_stock';

export interface StockAlert {
  sku: string;
  productName: string;
  level: StockAlertLevel;
  currentStock: number;
  availableStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  supplier?: string;
  message: string;
}

export function getAvailableStock(currentStock: number, reservedStock: number): number {
  return currentStock - reservedStock;
}

export function getStockAlertLevel(
  currentStock: number,
  reservedStock: number,
  reorderPoint: number
): StockAlertLevel {
  const available = getAvailableStock(currentStock, reservedStock);
  if (available <= 0) return 'out_of_stock';
  if (available <= reorderPoint / 2) return 'critical';
  if (available <= reorderPoint) return 'low_stock';
  return 'in_stock';
}

export function generateStockAlert(
  sku: string,
  productName: string,
  currentStock: number,
  reservedStock: number,
  reorderPoint: number,
  reorderQuantity: number,
  supplier?: string,
  platform?: string
): StockAlert | null {
  const level = getStockAlertLevel(currentStock, reservedStock, reorderPoint);
  const available = getAvailableStock(currentStock, reservedStock);
  
  if (level === 'in_stock') return null;

  let message: string;
  switch (level) {
    case 'out_of_stock':
      message = `Produkten '${productName}' (SKU: ${sku}) är nu slutsåld.${platform ? ` Försäljning på ${platform} bör pausas.` : ''}`;
      break;
    case 'critical':
      message = `Kritiskt lågt lager för '${productName}' (SKU: ${sku}). Endast ${available} kvar.${supplier ? ` Beställ ${reorderQuantity} enheter från ${supplier}.` : ''}`;
      break;
    case 'low_stock':
      message = `Lågt lager för '${productName}' (SKU: ${sku}). ${available} kvar.${supplier ? ` Beställ ${reorderQuantity} enheter från ${supplier}.` : ''}`;
      break;
  }

  return { sku, productName, level, currentStock, availableStock: available, reorderPoint, reorderQuantity, supplier, message };
}

export function getStockBadge(level: StockAlertLevel): { label: string; variant: 'destructive' | 'warning' | 'default' | 'secondary' } {
  switch (level) {
    case 'out_of_stock': return { label: 'SLUTSÅLD', variant: 'destructive' };
    case 'critical': return { label: 'KRITISKT', variant: 'destructive' };
    case 'low_stock': return { label: 'LÅGT LAGER', variant: 'warning' };
    case 'in_stock': return { label: 'I lager', variant: 'secondary' };
  }
}
