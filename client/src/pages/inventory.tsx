import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MinecraftPlayerWithInventory, ItemTotal } from "@shared/schema";

export default function InventoryPage() {
  const { user, isOwner } = useAuth();
  const [, setLocation] = useLocation();

  // Check admin access
  const isAdmin = isOwner || user?.hasAdminAccess || user?.role === "Supreme Leader";
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You don't have permission to view this page.</p>
            <button 
              onClick={() => setLocation("/")}
              className="text-primary hover:underline"
            >
              Go back to feed
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: players = [], isLoading: playersLoading } = useQuery<MinecraftPlayerWithInventory[]>({
    queryKey: ["/api/minecraft/players"],
  });

  const { data: itemTotals = [], isLoading: totalsLoading } = useQuery<ItemTotal[]>({
    queryKey: ["/api/minecraft/item-totals"],
  });

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Minecraft Inventory Management</h1>
        <p className="text-muted-foreground mt-2">View all player inventories and item totals across the team</p>
      </div>

      <Tabs defaultValue="by-item" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="by-item" data-testid="tab-by-item">Item Totals</TabsTrigger>
          <TabsTrigger value="by-player" data-testid="tab-by-player">By Player</TabsTrigger>
        </TabsList>

        <TabsContent value="by-item">
          <Card>
            <CardHeader>
              <CardTitle>Total Item Quantities</CardTitle>
            </CardHeader>
            <CardContent>
              {totalsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-pulse text-muted-foreground">Loading item totals...</div>
                </div>
              ) : itemTotals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items in inventory yet. Waiting for plugin data...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold" data-testid="header-item-name">Item Name</TableHead>
                        <TableHead className="text-right font-semibold" data-testid="header-total-quantity">Total Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemTotals.map((total) => (
                        <TableRow key={total.itemName} data-testid={`row-item-${total.itemName}`}>
                          <TableCell className="font-medium" data-testid={`cell-item-name-${total.itemName}`}>
                            {total.itemName}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`cell-quantity-${total.itemName}`}>
                            {total.totalQuantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-player">
          <Card>
            <CardHeader>
              <CardTitle>Player Inventories</CardTitle>
            </CardHeader>
            <CardContent>
              {playersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-pulse text-muted-foreground">Loading players...</div>
                </div>
              ) : players.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No players found. Waiting for plugin data...
                </div>
              ) : (
                <div className="space-y-4">
                  {players.map((player) => (
                    <Card key={player.id} data-testid={`card-player-${player.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg" data-testid={`text-player-name-${player.id}`}>
                            {player.playerName}
                          </CardTitle>
                          <span className="text-sm text-muted-foreground" data-testid={`text-uuid-${player.id}`}>
                            {player.uuid}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {player.inventoryItems.length === 0 ? (
                          <div className="text-muted-foreground text-sm">No items in inventory</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="font-semibold">Item</TableHead>
                                  <TableHead className="text-right font-semibold">Quantity</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {player.inventoryItems.map((item) => (
                                  <TableRow key={item.id} data-testid={`row-player-item-${player.id}-${item.itemName}`}>
                                    <TableCell className="font-medium" data-testid={`cell-player-item-name-${item.itemName}`}>
                                      {item.itemName}
                                    </TableCell>
                                    <TableCell className="text-right" data-testid={`cell-player-item-qty-${item.quantity}`}>
                                      {item.quantity}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
