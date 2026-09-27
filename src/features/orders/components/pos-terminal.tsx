"use client";
// Source: JoaoHenriqueBarbosa/FinOpenPOS (MIT) — apps/web/src/app/admin/pos/page.tsx
// Changes: tRPC/i18n/NFC-e removed; products = today's live stock (props); customer name + order
// type + payment select; submits to /api/orders (counter); bill download after order.

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { IconLoader2 as Loader2Icon, IconMinus as MinusIcon, IconPlus as PlusIcon, IconSearch as SearchIcon, IconTrash as Trash2Icon } from "@tabler/icons-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import type { StockRow } from "@/server/stock";

type POSProduct = { id: number; name: string; price: number; in_stock: number; category: string; quantity: number };

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash (paid now)" },
  { value: "upi", label: "UPI (paid now)" },
  { value: "card", label: "Card (paid now)" },
  { value: "upi_qr", label: "UPI QR (verify later)" },
  { value: "pay_on_collection", label: "Pay later at counter" },
];
const ORDER_TYPES = [
  { value: "dine_in", label: "Dine in" },
  { value: "takeaway", label: "Takeaway" },
  { value: "delivery", label: "Delivery" },
];

export default function POSPage({
  stock,
  currency,
  locale,
  taxPercent,
}: {
  stock: StockRow[];
  currency: string;
  locale: string;
  taxPercent: number;
}) {
  const router = useRouter();
  const formatCurrency = (n: number) => formatMoney(n, currency, locale);
  const products = useMemo(
    () => stock.map((s) => ({ id: s.menuItemId, name: s.name, price: s.price, in_stock: s.remaining, category: s.category })),
    [stock]
  );

  const [selectedProducts, setSelectedProducts] = useState<POSProduct[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderType, setOrderType] = useState("dine_in");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [lastOrder, setLastOrder] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const handleSelectProduct = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (product.in_stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    const existing = selectedProducts.find((p) => p.id === productId);
    if (existing && existing.quantity >= product.in_stock) {
      toast.error(`Only ${product.in_stock} ${product.name} left`);
      return;
    }
    if (existing) {
      setSelectedProducts(
        selectedProducts.map((p) =>
          p.id === productId ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
    } else {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    }
  };

  const handleQuantityChange = (productId: number, delta: number) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const newQty = p.quantity + delta;
        if (newQty <= 0) return p;
        if (product && newQty > product.in_stock) {
          toast.error(`Only ${product.in_stock} units available`);
          return p;
        }
        return { ...p, quantity: newQty };
      })
    );
  };

  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId));
  };

  const subtotal = selectedProducts.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0
  );
  const tax = (subtotal * taxPercent) / 100;
  const total = subtotal + tax;

  const canCreate = selectedProducts.length > 0 && (orderType !== "delivery" || address.trim());

  const handleCreateOrder = async () => {
    if (!canCreate) return;
    setPending(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "counter",
          customerName: customerName.trim() || "Walk-in",
          phone,
          address,
          type: orderType,
          paymentMethod,
          items: selectedProducts.map((p) => ({ menuItemId: p.id, qty: p.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create order");
      toast.success(`Order ${data.code} created`);
      setLastOrder(data.code);
      setSelectedProducts([]);
      setCustomerName("");
      setPhone("");
      setAddress("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create order");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid w-full gap-4 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Today&apos;s stock</CardTitle>
          <div className="relative !mt-2">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search dishes or category"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="grid max-h-[560px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectProduct(p.id)}
              disabled={p.in_stock <= 0}
              className="flex flex-col items-start rounded-lg border p-3 text-left transition hover:border-primary hover:bg-accent disabled:opacity-50"
            >
              <span className="text-sm font-medium leading-tight">{p.name}</span>
              <span className="mt-1 flex w-full items-center justify-between text-xs text-muted-foreground">
                {formatCurrency(p.price)}
                <Badge variant={p.in_stock > 5 ? "secondary" : "destructive"}>{p.in_stock} left</Badge>
              </span>
            </button>
          ))}
          {!filteredProducts.length && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              No dishes in today&apos;s stock. Add them from Daily Stock.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle>Sale details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <NativeSelect value={orderType} onChange={(e) => setOrderType(e.target.value)} className="w-full">
              {ORDER_TYPES.map((t) => (
                <NativeSelectOption key={t.value} value={t.value}>
                  {t.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full">
              {PAYMENT_METHODS.map((m) => (
                <NativeSelectOption key={m.value} value={m.value}>
                  {m.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {orderType === "delivery" && (
              <Input className="sm:col-span-2" placeholder="Delivery address" value={address} onChange={(e) => setAddress(e.target.value)} />
            )}
          </div>

          {selectedProducts.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
              Tap dishes on the left to add them
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Price</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProducts.map((product) => {
                    const source = products.find((p) => p.id === product.id);
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{formatCurrency(product.price)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => handleQuantityChange(product.id, -1)}
                              disabled={product.quantity <= 1}
                            >
                              <MinusIcon className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center tabular-nums">{product.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => handleQuantityChange(product.id, 1)}
                              disabled={source ? product.quantity >= source.in_stock : false}
                            >
                              <PlusIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(product.quantity * product.price)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveProduct(product.id)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
            <div className="text-sm">
              <div className="text-muted-foreground">
                Subtotal {formatCurrency(subtotal)} · Tax {taxPercent}% {formatCurrency(tax)}
              </div>
              <strong className="text-lg">Total: {formatCurrency(total)}</strong>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {lastOrder && (
                <Button variant="outline" nativeButton={false} render={<a href={`/api/orders/${lastOrder}/bill`} />}>
                  Bill {lastOrder}
                </Button>
              )}
              <Button
                onClick={handleCreateOrder}
                disabled={!canCreate || pending}
                size="lg"
                className="flex-1 sm:flex-initial"
              >
                {pending && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
                Create order
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
