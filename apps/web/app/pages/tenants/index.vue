<script setup>
const api = useApi();

const loading = ref(true);
const tenants = ref([]);
const contracts = ref([]);
const vacantRooms = ref([]);

const activeTab = ref('tenants'); // 'tenants' | 'contracts'

// Modals
const showAddTenantModal = ref(false);
const showAddContractModal = ref(false);

const tenantForm = ref({
  firstName: '',
  lastName: '',
  phone: '',
  idCardNumber: '',
  lineId: '',
  emergencyContact: '',
  emergencyPhone: ''
});

const contractForm = ref({
  tenantId: '',
  roomId: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  depositAmount: 5000,
  advanceRentAmount: 3500,
  note: ''
});

const formSubmitting = ref(false);
const errorMessage = ref('');

const loadData = async () => {
  loading.value = true;
  try {
    const [tenantsRes, contractsRes, roomsRes] = await Promise.all([
      api.getTenants(),
      api.getAllContracts(),
      api.getRooms({ status: 'VACANT' })
    ]);
    tenants.value = tenantsRes || [];
    contracts.value = contractsRes || [];
    vacantRooms.value = roomsRes || [];
  } catch (err) {
    console.error('Error fetching tenants data:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});

const handleCreateTenant = async () => {
  if (!tenantForm.value.firstName || !tenantForm.value.lastName || !tenantForm.value.phone) return;
  formSubmitting.value = true;
  errorMessage.value = '';
  try {
    await api.createTenant(tenantForm.value);
    showAddTenantModal.value = false;
    tenantForm.value = {
      firstName: '',
      lastName: '',
      phone: '',
      idCardNumber: '',
      lineId: '',
      emergencyContact: '',
      emergencyPhone: ''
    };
    await loadData();
  } catch (err) {
    errorMessage.value = err.data?.message || 'ไม่สามารถเพิ่มผู้เช่าได้';
  } finally {
    formSubmitting.value = false;
  }
};

const handleCreateContract = async () => {
  if (!contractForm.value.tenantId || !contractForm.value.roomId) return;
  formSubmitting.value = true;
  errorMessage.value = '';
  try {
    await api.createContract({
      ...contractForm.value,
      startDate: new Date(contractForm.value.startDate).toISOString(),
      endDate: new Date(contractForm.value.endDate).toISOString(),
      depositAmount: Number(contractForm.value.depositAmount),
      advanceRentAmount: Number(contractForm.value.advanceRentAmount)
    });
    showAddContractModal.value = false;
    await loadData();
  } catch (err) {
    errorMessage.value = err.data?.message || 'ไม่สามารถทำสัญญาเช่าได้';
  } finally {
    formSubmitting.value = false;
  }
};

const handleDeleteTenant = async (id, name) => {
  if (!confirm(`ยืนยันการลบข้อมูลผู้เช่า "${name}"?`)) return;
  try {
    await api.deleteTenant(id);
    await loadData();
  } catch (err) {
    alert(err.data?.message || 'ไม่สามารถลบข้อมูลผู้เช่าได้ (อาจมีสัญญาหรือประวัติบิลผูกอยู่)');
  }
};

const openContractForTenant = (tenant) => {
  contractForm.value.tenantId = tenant.id;
  showAddContractModal.value = true;
};

const showEditTenantModal = ref(false);
const editTenantForm = ref({
  id: '',
  firstName: '',
  lastName: '',
  phone: '',
  idCardNumber: '',
  lineId: '',
  emergencyContact: '',
  emergencyPhone: ''
});

const openEditTenant = (tenant) => {
  editTenantForm.value = {
    id: tenant.id,
    firstName: tenant.firstName,
    lastName: tenant.lastName,
    phone: tenant.phone,
    idCardNumber: tenant.idCardNumber || '',
    lineId: tenant.lineId || '',
    emergencyContact: tenant.emergencyContact || '',
    emergencyPhone: tenant.emergencyPhone || ''
  };
  errorMessage.value = '';
  showEditTenantModal.value = true;
};

const handleUpdateTenant = async () => {
  if (!editTenantForm.value.firstName || !editTenantForm.value.lastName || !editTenantForm.value.phone) return;
  formSubmitting.value = true;
  errorMessage.value = '';
  try {
    const { id, ...data } = editTenantForm.value;
    await api.updateTenant(id, data);
    showEditTenantModal.value = false;
    await loadData();
    alert('แก้ไขข้อมูลผู้เช่าเรียบร้อยแล้ว');
  } catch (err) {
    errorMessage.value = err.data?.message || 'ไม่สามารถแก้ไขข้อมูลผู้เช่าได้';
  } finally {
    formSubmitting.value = false;
  }
};

const showCheckoutModal = ref(false);
const activeCheckoutContract = ref(null);
const checkoutForm = ref({
  status: 'TERMINATED',
  note: ''
});

const openCheckoutModal = (contract) => {
  activeCheckoutContract.value = contract;
  checkoutForm.value = {
    status: 'TERMINATED',
    note: ''
  };
  showCheckoutModal.value = true;
};

const handleCheckoutSubmit = async () => {
  if (!activeCheckoutContract.value) return;
  formSubmitting.value = true;
  try {
    await api.updateContract(activeCheckoutContract.value.id, {
      status: checkoutForm.value.status,
      note: checkoutForm.value.note || 'ย้ายออกเรียบร้อย'
    });
    showCheckoutModal.value = false;
    await loadData();
    alert(`แจ้งย้ายออกห้อง ${activeCheckoutContract.value.room?.roomNumber} สำเร็จแล้ว (ห้องปรับเป็นสถานะห้องว่าง)`);
  } catch (err) {
    alert(err.data?.message || 'เกิดข้อผิดพลาดในการแจ้งย้ายออก');
  } finally {
    formSubmitting.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-lucide-users" class="w-6 h-6 text-primary-500" />
          ผู้เช่าและสัญญาเช่า
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          จัดการประวัติผู้เช่า เบอร์ติดต่อ และเอกสารสัญญาเช่าห้องพัก
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-file-signature"
          color="neutral"
          variant="outline"
          label="ทำสัญญาเช่า"
          @click="showAddContractModal = true"
        />
        <UButton
          icon="i-lucide-user-plus"
          color="primary"
          label="เพิ่มผู้เช่าใหม่"
          @click="showAddTenantModal = true"
        />
      </div>
    </div>

    <!-- Tabs Selection -->
    <div class="flex border-b border-slate-200 dark:border-slate-800">
      <button
        class="px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2"
        :class="activeTab === 'tenants' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700'"
        @click="activeTab = 'tenants'"
      >
        <UIcon name="i-lucide-users" class="w-4 h-4" />
        รายชื่อผู้เช่า ({{ tenants.length }})
      </button>
      <button
        class="px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2"
        :class="activeTab === 'contracts' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700'"
        @click="activeTab = 'contracts'"
      >
        <UIcon name="i-lucide-file-text" class="w-4 h-4" />
        สัญญาเช่า ({{ contracts.length }})
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-12 text-center text-slate-400">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
      <p class="text-sm">กำลังโหลดข้อมูล...</p>
    </div>

    <!-- TAB 1: Tenants List -->
    <div v-else-if="activeTab === 'tenants'" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      <div v-if="tenants.length === 0" class="py-12 text-center text-slate-400">
        <UIcon name="i-lucide-users" class="w-10 h-10 mx-auto mb-2 text-slate-300" />
        <p class="text-sm font-medium">ยังไม่มีข้อมูลผู้เช่าในระบบ</p>
        <UButton class="mt-3" size="xs" label="เพิ่มผู้เช่าคนแรก" @click="showAddTenantModal = true" />
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead class="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="px-5 py-3.5">ชื่อ-นามสกุล</th>
              <th class="px-5 py-3.5">เบอร์โทร</th>
              <th class="px-5 py-3.5">ห้องที่พักอยู่</th>
              <th class="px-5 py-3.5">Line ID / บัตร ปชช.</th>
              <th class="px-5 py-3.5">ติดต่อฉุกเฉิน</th>
              <th class="px-5 py-3.5 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="t in tenants" :key="t.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
              <td class="px-5 py-4 font-bold text-slate-900 dark:text-white">
                {{ t.firstName }} {{ t.lastName }}
              </td>
              <td class="px-5 py-4 font-mono text-xs">
                {{ t.phone }}
              </td>
              <td class="px-5 py-4">
                <span v-if="t.contracts && t.contracts.length > 0" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <UIcon name="i-lucide-door-closed" class="w-3.5 h-3.5" />
                  ห้อง {{ t.contracts[0].room?.roomNumber }} ({{ t.contracts[0].room?.building?.name || 'ตึกหลัก' }})
                </span>
                <span v-else class="text-xs text-slate-400">ยังไม่มีห้องพัก</span>
              </td>
              <td class="px-5 py-4 text-xs text-slate-500">
                <div>Line: {{ t.lineId || '-' }}</div>
                <div class="text-[11px] text-slate-400">ID: {{ t.idCardNumber || '-' }}</div>
              </td>
              <td class="px-5 py-4 text-xs text-slate-500">
                <div v-if="t.emergencyContact">{{ t.emergencyContact }} ({{ t.emergencyPhone }})</div>
                <div v-else class="text-slate-400">-</div>
              </td>
              <td class="px-5 py-4 text-right space-x-2">
                <button
                  class="text-xs text-amber-600 hover:text-amber-800 font-medium px-2 py-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  @click="openEditTenant(t)"
                >
                  แก้ไข
                </button>
                <button
                  v-if="!t.contracts || t.contracts.length === 0"
                  class="text-xs text-primary-600 hover:text-primary-800 font-medium px-2 py-1 rounded hover:bg-primary-50"
                  @click="openContractForTenant(t)"
                >
                  ทำสัญญา
                </button>
                <button
                  class="text-xs text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50"
                  @click="handleDeleteTenant(t.id, `${t.firstName} ${t.lastName}`)"
                >
                  ลบ
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: Contracts List -->
    <div v-else class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      <div v-if="contracts.length === 0" class="py-12 text-center text-slate-400">
        <UIcon name="i-lucide-file-text" class="w-10 h-10 mx-auto mb-2 text-slate-300" />
        <p class="text-sm font-medium">ยังไม่มีรายการสัญญาเช่า</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead class="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="px-5 py-3.5">เลขที่สัญญา</th>
              <th class="px-5 py-3.5">ผู้เช่า</th>
              <th class="px-5 py-3.5">ห้องพัก</th>
              <th class="px-5 py-3.5">ระยะเวลาสัญญา</th>
              <th class="px-5 py-3.5">เงินประกัน / มัดจำ</th>
              <th class="px-5 py-3.5">สถานะ</th>
              <th class="px-5 py-3.5 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="c in contracts" :key="c.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
              <td class="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white">
                {{ c.contractNumber }}
              </td>
              <td class="px-5 py-4 font-medium">
                {{ c.tenant?.firstName }} {{ c.tenant?.lastName }}
              </td>
              <td class="px-5 py-4 font-bold text-primary-600">
                ห้อง {{ c.room?.roomNumber }}
              </td>
              <td class="px-5 py-4 text-xs text-slate-500">
                {{ new Date(c.startDate).toLocaleDateString('th-TH') }} - {{ new Date(c.endDate).toLocaleDateString('th-TH') }}
              </td>
              <td class="px-5 py-4 font-medium text-xs">
                ฿{{ Number(c.depositAmount || 0).toLocaleString() }}
              </td>
              <td class="px-5 py-4">
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-semibold"
                  :class="c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'"
                >
                  {{ c.status === 'ACTIVE' ? 'กำลังเช่าอยู่' : (c.status === 'TERMINATED' ? 'ยกเลิก/ย้ายออกแล้ว' : c.status) }}
                </span>
              </td>
              <td class="px-5 py-4 text-right">
                <button
                  v-if="c.status === 'ACTIVE'"
                  class="text-xs text-rose-600 hover:text-rose-800 font-medium px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition inline-flex items-center gap-1 shadow-xs"
                  @click="openCheckoutModal(c)"
                >
                  <UIcon name="i-lucide-log-out" class="w-3.5 h-3.5" />
                  แจ้งย้ายออก / คืนห้อง
                </button>
                <span v-else class="text-xs text-slate-400">สิ้นสุดสัญญาแล้ว</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Add Tenant -->
    <div v-if="showAddTenantModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">เพิ่มข้อมูลผู้เช่าใหม่</h3>
        <form @submit.prevent="handleCreateTenant" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ชื่อ *</label>
              <input v-model="tenantForm.firstName" required type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">นามสกุล *</label>
              <input v-model="tenantForm.lastName" required type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">เบอร์โทรศัพท์ *</label>
              <input v-model="tenantForm.phone" required type="tel" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Line ID</label>
              <input v-model="tenantForm.lineId" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">เลขประจำตัวประชาชน (13 หลัก)</label>
            <input v-model="tenantForm.idCardNumber" type="text" maxlength="13" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ชื่อผู้ติดต่อฉุกเฉิน</label>
              <input v-model="tenantForm.emergencyContact" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">เบอร์ผู้ติดต่อฉุกเฉิน</label>
              <input v-model="tenantForm.emergencyPhone" type="tel" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
          </div>

          <p v-if="errorMessage" class="text-xs text-rose-500">{{ errorMessage }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="px-4 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100" @click="showAddTenantModal = false">ยกเลิก</button>
            <button type="submit" :disabled="formSubmitting" class="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">บันทึกผู้เช่า</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Add Contract -->
    <div v-if="showAddContractModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">ทำสัญญาเช่าห้องพักใหม่</h3>
        <form @submit.prevent="handleCreateContract" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">เลือกผู้เช่า *</label>
            <select v-model="contractForm.tenantId" required class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
              <option value="" disabled>-- เลือกผู้เช่า --</option>
              <option v-for="t in tenants" :key="t.id" :value="t.id" :disabled="t.contracts && t.contracts.length > 0">
                {{ t.firstName }} {{ t.lastName }} ({{ t.phone }}) {{ (t.contracts && t.contracts.length > 0) ? ' [มีห้องเช่าแล้ว]' : '' }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">เลือกห้องพักที่ว่าง *</label>
            <select v-model="contractForm.roomId" required class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
              <option value="" disabled>-- เลือกห้องว่าง --</option>
              <option v-for="r in vacantRooms" :key="r.id" :value="r.id">ห้อง {{ r.roomNumber }} - {{ r.building?.name || 'ตึกหลัก' }} (฿{{ Number(r.monthlyRent || r.baseRent).toLocaleString() }}/ด.)</option>
            </select>
            <p v-if="vacantRooms.length === 0" class="text-[11px] text-amber-500 mt-1">ขณะนี้ไม่มีห้องว่าง</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">วันเริ่มสัญญา</label>
              <input v-model="contractForm.startDate" required type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">วันสิ้นสุดสัญญา</label>
              <input v-model="contractForm.endDate" required type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">เงินประกัน (บาท)</label>
              <input v-model="contractForm.depositAmount" type="number" min="0" step="500" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ค่าเช่าล่วงหน้า (บาท)</label>
              <input v-model="contractForm.advanceRentAmount" type="number" min="0" step="100" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
          </div>

          <p v-if="errorMessage" class="text-xs text-rose-500">{{ errorMessage }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="px-4 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100" @click="showAddContractModal = false">ยกเลิก</button>
            <button type="submit" :disabled="formSubmitting" class="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">บันทึกสัญญา</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Edit Tenant -->
    <div v-if="showEditTenantModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">แก้ไขข้อมูลผู้เช่า</h3>
        <form @submit.prevent="handleUpdateTenant" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ชื่อ *</label>
              <input v-model="editTenantForm.firstName" required type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">นามสกุล *</label>
              <input v-model="editTenantForm.lastName" required type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">เบอร์โทรศัพท์ *</label>
              <input v-model="editTenantForm.phone" required type="tel" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Line ID</label>
              <input v-model="editTenantForm.lineId" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">เลขประจำตัวประชาชน (13 หลัก)</label>
            <input v-model="editTenantForm.idCardNumber" type="text" maxlength="13" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ชื่อผู้ติดต่อฉุกเฉิน</label>
              <input v-model="editTenantForm.emergencyContact" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">เบอร์ผู้ติดต่อฉุกเฉิน</label>
              <input v-model="editTenantForm.emergencyPhone" type="tel" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
          </div>

          <p v-if="errorMessage" class="text-xs text-rose-500">{{ errorMessage }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="px-4 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100" @click="showEditTenantModal = false">ยกเลิก</button>
            <button type="submit" :disabled="formSubmitting" class="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">บันทึกการแก้ไข</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Checkout / Terminate Contract -->
    <div v-if="showCheckoutModal && activeCheckoutContract" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">แจ้งย้ายออก / คืนห้องพัก</h3>
            <p class="text-xs text-slate-500">ห้อง {{ activeCheckoutContract.room?.roomNumber }} - ผู้เช่า: {{ activeCheckoutContract.tenant?.firstName }} {{ activeCheckoutContract.tenant?.lastName }}</p>
          </div>
          <button class="text-slate-400 hover:text-slate-600 p-1" @click="showCheckoutModal = false">
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleCheckoutSubmit" class="space-y-4">
          <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs space-y-1 text-amber-800 dark:text-amber-300">
            <p class="font-semibold">💰 ข้อมูลเงินประกัน / มัดจำ</p>
            <p>เงินประกันที่ต้องคืน (หากไม่มีค่าเสียหาย): <span class="font-bold text-sm">฿{{ Number(activeCheckoutContract.depositAmount || 0).toLocaleString() }}</span></p>
            <p class="text-[11px] text-amber-600 dark:text-amber-400">* เมื่อยืนยันย้ายออก ห้อง {{ activeCheckoutContract.room?.roomNumber }} จะถูกเปลี่ยนสถานะเป็น "ห้องว่าง" โดยอัตโนมัติ</p>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">สาเหตุ / รูปแบบการสิ้นสุดสัญญา *</label>
            <select v-model="checkoutForm.status" required class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
              <option value="TERMINATED">ย้ายออกก่อนกำหนด / ขอยกเลิกสัญญา (TERMINATED)</option>
              <option value="EXPIRED">สิ้นสุดตามกำหนดสัญญาเช่า (EXPIRED)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">บันทึกตรวจห้อง / การคืนเงินประกัน</label>
            <textarea
              v-model="checkoutForm.note"
              rows="3"
              placeholder="เช่น ตรวจสภาพห้องสมบูรณ์ คืนเงินประกันครบ หรือ หักค่าทำความสะอาด 500 บาท..."
              class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            ></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="px-4 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100" @click="showCheckoutModal = false">ยกเลิก</button>
            <button type="submit" :disabled="formSubmitting" class="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium">
              ยืนยันการย้ายออก
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
