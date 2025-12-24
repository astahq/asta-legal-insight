import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CreditCard, Receipt, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Billing = () => {
  return (
    <DashboardLayout userName="Jack Williams">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground">Manage your subscription and billing</p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Current Plan
                  <Badge variant="secondary">Pro</Badge>
                </CardTitle>
                <CardDescription>You're currently on the Pro plan</CardDescription>
              </div>
              <Button variant="outline">Change Plan</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">£49</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                Unlimited property analyses
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                Advanced risk detection
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                Priority support
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Method
            </CardTitle>
            <CardDescription>Manage your payment details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center text-white text-xs font-bold">
                  VISA
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">•••• •••• •••• 4242</p>
                  <p className="text-xs text-muted-foreground">Expires 12/26</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">Update</Button>
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Billing History
            </CardTitle>
            <CardDescription>View your past invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { date: "Dec 1, 2025", amount: "£49.00", status: "Paid" },
                { date: "Nov 1, 2025", amount: "£49.00", status: "Paid" },
                { date: "Oct 1, 2025", amount: "£49.00", status: "Paid" },
              ].map((invoice, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{invoice.date}</p>
                    <p className="text-xs text-muted-foreground">Pro Plan - Monthly</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-foreground">{invoice.amount}</span>
                    <Badge variant="outline" className="text-success border-success">
                      {invoice.status}
                    </Badge>
                    <Button variant="ghost" size="sm">Download</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
