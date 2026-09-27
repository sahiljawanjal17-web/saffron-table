import { asc, desc, eq } from 'drizzle-orm';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/db';
import { salaryPayments, staff } from '@/db/schema';
import { StaffFormSheetTrigger } from '@/features/staff/components/staff-form-sheet';
import { CellAction } from '@/features/staff/components/cell-action';
import { getSetting } from '@/lib/settings';
import { formatMoney } from '@/lib/money';

export const metadata = { title: 'Dashboard: Staff' };

export default async function StaffPage() {
  const [members, payments, business] = await Promise.all([
    db.select().from(staff).orderBy(asc(staff.name)),
    db
      .select({
        id: salaryPayments.id,
        month: salaryPayments.month,
        amount: salaryPayments.amount,
        paidOn: salaryPayments.paidOn,
        note: salaryPayments.note,
        name: staff.name
      })
      .from(salaryPayments)
      .innerJoin(staff, eq(staff.id, salaryPayments.staffId))
      .orderBy(desc(salaryPayments.paidOn))
      .limit(30),
    getSetting('business')
  ]);
  const money = (n: number) => formatMoney(n, business.currency, business.locale);
  const monthlyPayroll = members.filter((m) => m.status !== 'inactive').reduce((s, m) => s + (m.salary ?? 0), 0);

  return (
    <PageContainer
      pageTitle='Staff'
      pageDescription='Team details, roles and salaries. Every field except name and role is optional.'
      pageHeaderAction={<StaffFormSheetTrigger />}
    >
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardDescription>Team members</CardDescription>
            <CardTitle className='text-3xl tabular-nums'>{members.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active now</CardDescription>
            <CardTitle className='text-3xl tabular-nums'>{members.filter((m) => m.status === 'active').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Monthly payroll (fixed salaries)</CardDescription>
            <CardTitle className='text-3xl tabular-nums'>{money(monthlyPayroll)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className='mt-4 rounded-xl border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className='text-right'>Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='w-12' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className='font-medium'>{m.name}</TableCell>
                <TableCell>{m.role}</TableCell>
                <TableCell>{m.phone ?? '—'}</TableCell>
                <TableCell>{m.joinDate ?? '—'}</TableCell>
                <TableCell className='text-right tabular-nums'>{m.salary != null ? money(m.salary) : '—'}</TableCell>
                <TableCell>
                  <Badge variant={m.status === 'active' ? 'secondary' : 'outline'} className='capitalize'>
                    {m.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <CellAction data={m} />
                </TableCell>
              </TableRow>
            ))}
            {!members.length && (
              <TableRow>
                <TableCell colSpan={7} className='text-muted-foreground py-10 text-center'>
                  No staff yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Card className='mt-4'>
        <CardHeader>
          <CardTitle>Recent salary payments</CardTitle>
          <CardDescription>Use “Record salary” from a staff row to add one.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Paid on</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className='text-right'>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.month}</TableCell>
                  <TableCell>{p.paidOn}</TableCell>
                  <TableCell className='text-muted-foreground'>{p.note ?? ''}</TableCell>
                  <TableCell className='text-right tabular-nums'>{money(p.amount)}</TableCell>
                </TableRow>
              ))}
              {!payments.length && (
                <TableRow>
                  <TableCell colSpan={5} className='text-muted-foreground py-6 text-center'>
                    No payments recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
