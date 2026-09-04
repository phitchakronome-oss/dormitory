<script setup>
const api = useApi();

const now = new Date();
const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const selectedMonth = ref(currentMonthStr);
const selectedStatus = ref('ALL');

const loading = ref(true);
const invoices = ref([]);

// Modals
const showGenerateModal = ref(false);
const showPaymentModal = ref(false);
const showDetailModal = ref(false);

const generateForm = ref({
  billingMonth: currentMonthStr,
  dueDate: new Date(now.getFullYear(), now.getMonth(), 5).toISOString().slice(0, 10),
  commonFee: 200
});

const paymentForm = ref({
  invoiceId: '',
  invoiceNumber: '',
  totalAmount: 0,
  amount: 0,
  method: 'TRANSFER',
  receivedBy: 'ผู้ดูแลหอพัก',
  note: ''
});

const activeInvoiceDetail = ref(null);
const formSubmitting = ref(false);
const errorMessage = ref('');

const loadInvoices = async () => {
  loading.value = true;
  try {
    const params = {};
    if (selectedMonth.value) params.month = selectedMonth.value;
    if (selectedStatus.value !== 'ALL') params.status = selectedStatus.value;
    const res = await api.getInvoices(params.month, params.status);
    invoices.value = res || [];
  } catch (err) {
    console.error('Failed to load invoices:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadInvoices();
});

watch([selectedMonth, selectedStatus], () => {
  loadInvoices();
});

const totalBilled = computed(() => {
  return invoices.value.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
});

const totalPaid = computed(() => {
  return invoices.value
    .filter(inv => inv.status === 'PAID')
    .reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
});

const totalPending = computed(() => {
  return invoices.value
    .filter(inv => inv.status === 'PENDING' || inv.status === 'OVERDUE')
    .reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
});

const handleGenerateInvoices = async () => {
  formSubmitting.value = true;
  errorMessage.value = '';
  try {
    await api.generateInvoices({
      billingMonth: generateForm.value.billingMonth,
      dueDate: new Date(generateForm.value.dueDate).toISOString(),
      commonFee: Number(generateForm.value.commonFee)
    });
    showGenerateModal.value = false;
    await loadInvoices();
    alert('สร้างบิลประจำเดือนเรียบร้อยแล้ว');
  } catch (err) {
    errorMessage.value = err.data?.message || 'เกิดข้อผิดพลาดในการสร้างบิล';
  } finally {
    formSubmitting.value = false;
  }
};

const openPaymentModal = (invoice) => {
  paymentForm.value = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    totalAmount: Number(invoice.totalAmount),
    amount: Number(invoice.totalAmount),
    method: 'TRANSFER',
    receivedBy: 'ผู้ดูแลหอพัก',
    note: ''
  };
  showPaymentModal.value = true;
};

const handleRecordPayment = async () => {
  formSubmitting.value = true;
  errorMessage.value = '';
  try {
    await api.recordPayment({
      invoiceId: paymentForm.value.invoiceId,
      amount: Number(paymentForm.value.amount),
      method: paymentForm.value.method,
      receivedBy: paymentForm.value.receivedBy,
      note: paymentForm.value.note
    });
    showPaymentModal.value = false;
    await loadInvoices();
    alert('บันทึกการชำระเงินเรียบร้อยแล้ว');
  } catch (err) {
    errorMessage.value = err.data?.message || 'เกิดข้อผิดพลาดในการบันทึกการชำระเงิน';
  } finally {
    formSubmitting.value = false;
  }
};

const openInvoiceDetail = (invoice) => {
  activeInvoiceDetail.value = invoice;
  showDetailModal.value = true;
};

const printInvoice = () => {
  window.print();
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'PAID':
      return { label: 'ชำระแล้ว', class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
    case 'PENDING':
      return { label: 'รอชำระ', class: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
    case 'OVERDUE':
      return { label: 'เกินกำหนด', class: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' };
    case 'CANCELLED':
      return { label: 'ยกเลิก', class: 'bg-slate-100 text-slate-600' };
    default:
      return { label: status, class: 'bg-slate-100 text-slate-800' };
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-lucide-receipt" class="w-6 h-6 text-primary-500" />
          บิลค่าเช่าและบันทึกการชำระเงิน
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          ออกใบแจ้งหนี้ประจำเดือน สรุปยอดค่าน้ำ-ไฟ และรับชำระเงิน
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-file-plus-2"
          color="primary"
          label="สร้างบิลประจำเดือน"
          @click="showGenerateModal = true"
        />
      </div>
    </div>

    <!-- Summary Metrics Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">ยอดรวมบิลทั้งหมด</p>
        <p class="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
          ฿{{ totalBilled.toLocaleString() }}
        </p>
      </div>

      <div class="p-5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-950 shadow-xs">
        <p class="text-xs font-semibold text-emerald-600 uppercase tracking-wider">รับชำระแล้ว</p>
        <p class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
          ฿{{ totalPaid.toLocaleString() }}
        </p>
      </div>

      <div class="p-5 bg-white dark:bg-slate-900 rounded-xl border border-rose-100 dark:border-rose-950 shadow-xs">
        <p class="text-xs font-semibold text-rose-600 uppercase tracking-wider">คงค้างชำระ</p>
        <p class="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
          ฿{{ totalPending.toLocaleString() }}
        </p>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      <div class="flex flex-wrap items-center gap-4">
        <div>
          <span class="text-xs font-medium text-slate-500 mr-2">รอบเดือน:</span>
          <input
            v-model="selectedMonth"
            type="month"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          />
        </div>

        <div>
          <span class="text-xs font-medium text-slate-500 mr-2">สถานะ:</span>
          <select
            v-model="selectedStatus"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">ทั้งหมด</option>
            <option value="PENDING">รอชำระ (PENDING)</option>
            <option value="PAID">ชำระแล้ว (PAID)</option>
            <option value="OVERDUE">เกินกำหนด (OVERDUE)</option>
          </select>
        </div>
      </div>

      <div class="text-xs text-slate-500">
        พบทั้งหมด {{ invoices.length }} รายการ
      </div>
    </div>

    <!-- Invoices Table -->
    <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      <div v-if="loading" class="py-12 text-center text-slate-400">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
        <p class="text-sm">กำลังโหลดข้อมูลบิล...</p>
      </div>

      <div v-else-if="invoices.length === 0" class="py-12 text-center text-slate-400">
        <UIcon name="i-lucide-receipt" class="w-10 h-10 mx-auto mb-2 text-slate-300" />
        <p class="text-sm font-medium">ไม่พบบิลในรอบเดือนนี้</p>
        <p class="text-xs text-slate-400 mt-1">กดปุ่ม "สร้างบิลประจำเดือน" เพื่อออกบิลสำหรับห้องที่มีสัญญาเช่า</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead class="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="px-5 py-3.5">เลขที่บิล</th>
              <th class="px-5 py-3.5">ห้องพัก / ผู้เช่า</th>
              <th class="px-5 py-3.5">ค่าห้อง</th>
              <th class="px-5 py-3.5">ค่าน้ำ / ค่าไฟ</th>
              <th class="px-5 py-3.5">ส่วนกลาง</th>
              <th class="px-5 py-3.5">ยอดรวมสุทธิ</th>
              <th class="px-5 py-3.5">สถานะ</th>
              <th class="px-5 py-3.5 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="inv in invoices" :key="inv.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
              <td class="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white text-xs">
                {{ inv.invoiceNumber }}
              </td>
              <td class="px-5 py-4">
                <span class="font-bold text-slate-900 dark:text-white">ห้อง {{ inv.room?.roomNumber }}</span>
                <span class="block text-xs text-slate-400">{{ inv.tenant?.firstName }} {{ inv.tenant?.lastName }}</span>
              </td>
              <td class="px-5 py-4 text-xs">
                ฿{{ Number(inv.roomRent || 0).toLocaleString() }}
              </td>
              <td class="px-5 py-4 text-xs">
                <div>น้ำ: ฿{{ Number(inv.waterCost || 0).toLocaleString() }}</div>
                <div>ไฟ: ฿{{ Number(inv.electricityCost || 0).toLocaleString() }}</div>
              </td>
              <td class="px-5 py-4 text-xs">
                ฿{{ Number(inv.commonFee || 0).toLocaleString() }}
              </td>
              <td class="px-5 py-4 font-extrabold text-slate-900 dark:text-white">
                ฿{{ Number(inv.totalAmount || 0).toLocaleString() }}
              </td>
              <td class="px-5 py-4">
                <span class="px-2.5 py-1 rounded-full text-xs font-semibold" :class="getStatusBadge(inv.status).class">
                  {{ getStatusBadge(inv.status).label }}
                </span>
              </td>
              <td class="px-5 py-4 text-right space-x-2">
                <button
                  class="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  @click="openInvoiceDetail(inv)"
                >
                  ดูบิล
                </button>
                <button
                  v-if="inv.status !== 'PAID'"
                  class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2.5 py-1 rounded-md transition"
                  @click="openPaymentModal(inv)"
                >
                  รับชำระ
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Generate Invoices -->
    <div v-if="showGenerateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">สร้างบิลค่าเช่าประจำเดือน</h3>
        <p class="text-xs text-slate-500 mb-4">
          ระบบจะนำค่าเช่าห้อง ค่าน้ำ และค่าไฟฟ้าตามมิเตอร์ที่จดไว้ มาคำนวณเป็นบิลของทุกห้องที่มีสัญญาเช่าอยู่
        </p>
        <form @submit.prevent="handleGenerateInvoices" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">รอบเดือนที่ต้องการออกบิล</label>
            <input v-model="generateForm.billingMonth" required type="month" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">วันครบกำหนดชำระ (Due Date)</label>
            <input v-model="generateForm.dueDate" required type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ค่าส่วนกลางมาตรฐาน (บาท/ห้อง)</label>
            <input v-model="generateForm.commonFee" type="number" min="0" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>

          <p v-if="errorMessage" class="text-xs text-rose-500">{{ errorMessage }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="px-4 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100" @click="showGenerateModal = false">ยกเลิก</button>
            <button type="submit" :disabled="formSubmitting" class="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">คำนวณและออกบิล</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Record Payment -->
    <div v-if="showPaymentModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">บันทึกการชำระเงิน</h3>
        <p class="text-xs text-slate-500 mb-4">
          เลขที่บิล: <span class="font-bold text-slate-700 dark:text-slate-300 font-mono">{{ paymentForm.invoiceNumber }}</span>
        </p>

        <form @submit.prevent="handleRecordPayment" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ยอดเงินที่ชำระ (บาท)</label>
            <input v-model="paymentForm.amount" required type="number" min="1" step="any" class="w-full px-3 py-2 text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ช่องทางการชำระเงิน</label>
            <select v-model="paymentForm.method" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
              <option value="TRANSFER">โอนเงินเข้าบัญชี (Bank Transfer)</option>
              <option value="QR">สแกน QR PromptPay</option>
              <option value="CASH">เงินสด (Cash)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ผู้รับเงิน / ผู้บันทึก</label>
            <input v-model="paymentForm.receivedBy" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">หมายเหตุเพิ่มเติม</label>
            <input v-model="paymentForm.note" type="text" placeholder="เช่น อ้างอิงเลขสลิป" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>

          <p v-if="errorMessage" class="text-xs text-rose-500">{{ errorMessage }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="px-4 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100" @click="showPaymentModal = false">ยกเลิก</button>
            <button type="submit" :disabled="formSubmitting" class="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">บันทึกรับเงิน</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Invoice Details / Print View -->
    <div v-if="showDetailModal && activeInvoiceDetail" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">ใบแจ้งหนี้ค่าเช่าห้องพัก</h3>
            <p class="text-xs text-slate-400">เลขที่ {{ activeInvoiceDetail.invoiceNumber }}</p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold" :class="getStatusBadge(activeInvoiceDetail.status).class">
            {{ getStatusBadge(activeInvoiceDetail.status).label }}
          </span>
        </div>

        <div class="grid grid-cols-2 text-xs text-slate-600 dark:text-slate-300 gap-2">
          <div><strong>ห้อง:</strong> {{ activeInvoiceDetail.room?.roomNumber }}</div>
          <div><strong>ผู้เช่า:</strong> {{ activeInvoiceDetail.tenant?.firstName }} {{ activeInvoiceDetail.tenant?.lastName }}</div>
          <div><strong>รอบเดือน:</strong> {{ activeInvoiceDetail.billingMonth }}</div>
          <div><strong>กำหนดชำระ:</strong> {{ new Date(activeInvoiceDetail.dueDate).toLocaleDateString('th-TH') }}</div>
        </div>

        <!-- Breakdown List -->
        <div class="border rounded-xl p-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <div class="py-2 flex justify-between">
            <span>ค่าเช่าห้อง</span>
            <span class="font-medium">฿{{ Number(activeInvoiceDetail.roomRent).toLocaleString() }}</span>
          </div>
          <div class="py-2 flex justify-between">
            <span>ค่าน้ำประปา ({{ activeInvoiceDetail.waterUnits }} หน่วย)</span>
            <span class="font-medium">฿{{ Number(activeInvoiceDetail.waterCost).toLocaleString() }}</span>
          </div>
          <div class="py-2 flex justify-between">
            <span>ค่าไฟฟ้า ({{ activeInvoiceDetail.electricityUnits }} หน่วย)</span>
            <span class="font-medium">฿{{ Number(activeInvoiceDetail.electricityCost).toLocaleString() }}</span>
          </div>
          <div class="py-2 flex justify-between">
            <span>ค่าส่วนกลาง</span>
            <span class="font-medium">฿{{ Number(activeInvoiceDetail.commonFee).toLocaleString() }}</span>
          </div>
          <div class="py-2.5 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
            <span>ยอดรวมสุทธิ</span>
            <span>฿{{ Number(activeInvoiceDetail.totalAmount).toLocaleString() }}</span>
          </div>
        </div>

        <div class="flex justify-between items-center pt-2">
          <button
            type="button"
            class="px-4 py-2 text-xs bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition"
            @click="printInvoice"
          >
            <UIcon name="i-lucide-printer" class="w-4 h-4" />
            พิมพ์บิล / บันทึก PDF
          </button>
          <button type="button" class="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-medium" @click="showDetailModal = false">
            ปิด
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  :global(header),
  :global(footer),
  :global(.no-print) {
    display: none !important;
  }
  :global(body) {
    background: white !important;
    color: black !important;
  }
}
</style>
