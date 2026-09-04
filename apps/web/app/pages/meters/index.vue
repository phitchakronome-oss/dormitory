<script setup>
const api = useApi();

const now = new Date();
const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const selectedMonth = ref(currentMonthStr);
const waterRate = ref(17);
const electricityRate = ref(7);

const loading = ref(true);
const saving = ref(false);
const saveSuccess = ref(false);

const filterStatus = ref('all');

const meterRows = ref([]);

const loadData = async () => {
  loading.value = true;
  saveSuccess.value = false;
  try {
    const res = await api.getMeterReadings(selectedMonth.value);

    meterRows.value = (res || []).map((item) => {
      const reading = item.reading;
      const prev = item.prevReading;
      const isRecorded = !!reading;

      return {
        roomId: item.room.id,
        roomNumber: item.room.roomNumber,
        floor: item.room.floor,
        buildingName: item.room.building?.name || 'ตึกหลัก',
        tenantName: item.tenant
          ? `${item.tenant.firstName} ${item.tenant.lastName}`
          : 'ห้องว่าง (ไม่มีผู้เช่า)',
        hasTenant: !!item.tenant,

        waterPrevUnit: isRecorded
          ? Number(reading.waterPrevUnit)
          : (prev ? Number(prev.waterCurrUnit) : 0),
        waterCurrUnit: isRecorded
          ? Number(reading.waterCurrUnit)
          : (prev ? Number(prev.waterCurrUnit) : 0),

        electricityPrevUnit: isRecorded
          ? Number(reading.electricityPrevUnit)
          : (prev ? Number(prev.electricityCurrUnit) : 0),
        electricityCurrUnit: isRecorded
          ? Number(reading.electricityCurrUnit)
          : (prev ? Number(prev.electricityCurrUnit) : 0),

        isRecorded,
        isEditing: false,
        hasInvoice: !!item.hasInvoice,
        invoiceNumber: item.invoiceNumber || null,
        originalWaterCurr: isRecorded ? Number(reading.waterCurrUnit) : 0,
        originalElecCurr: isRecorded ? Number(reading.electricityCurrUnit) : 0
      };
    });
  } catch (err) {
    console.error('Failed to load meter data:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});

watch(selectedMonth, () => {
  loadData();
});

const calculateUsage = (curr, prev) => {
  const c = Number(curr) || 0;
  const p = Number(prev) || 0;
  return c >= p ? c - p : 0;
};

// Computed stats
const recordedCount = computed(() => meterRows.value.filter(r => r.isRecorded).length);
const unrecordedCount = computed(() => meterRows.value.filter(r => !r.isRecorded).length);
const allRecorded = computed(() => meterRows.value.length > 0 && unrecordedCount.value === 0);

const filteredRows = computed(() => {
  if (filterStatus.value === 'unrecorded') {
    return meterRows.value.filter(r => !r.isRecorded);
  }
  if (filterStatus.value === 'recorded') {
    return meterRows.value.filter(r => r.isRecorded);
  }
  return meterRows.value;
});

// Row Actions
const startEditing = (row) => {
  if (row.hasInvoice) {
    alert(`ห้อง ${row.roomNumber} ได้ออกบิลไปแล้ว (#${row.invoiceNumber}) ไม่สามารถแก้ไขเลขมิเตอร์ได้ เพื่อป้องกันข้อมูลบิลคลาดเคลื่อน`);
    return;
  }
  row.isEditing = true;
};

const cancelEditing = (row) => {
  row.waterCurrUnit = row.originalWaterCurr;
  row.electricityCurrUnit = row.originalElecCurr;
  row.isEditing = false;
};

const handleSaveSingle = async (row) => {
  try {
    await api.recordMeter({
      roomId: row.roomId,
      billingMonth: selectedMonth.value,
      waterCurrUnit: Number(row.waterCurrUnit || 0),
      waterUnitRate: Number(waterRate.value || 17),
      electricityCurrUnit: Number(row.electricityCurrUnit || 0),
      electricityUnitRate: Number(electricityRate.value || 7)
    });
    row.isRecorded = true;
    row.isEditing = false;
    row.originalWaterCurr = Number(row.waterCurrUnit || 0);
    row.originalElecCurr = Number(row.electricityCurrUnit || 0);
    alert(`บันทึกมิเตอร์ห้อง ${row.roomNumber} เรียบร้อยแล้ว`);
  } catch (err) {
    alert(err.data?.message || `ไม่สามารถบันทึกห้อง ${row.roomNumber} ได้`);
  }
};

const handleSaveAll = async () => {
  const pendingRows = meterRows.value.filter(r => (!r.isRecorded || r.isEditing) && !r.hasInvoice);

  if (pendingRows.length === 0) {
    alert('ทุกห้องได้บันทึกมิเตอร์ครบเรียบร้อยแล้ว ไม่จำเป็นต้องบันทึกซ้ำ');
    return;
  }

  saving.value = true;
  saveSuccess.value = false;
  try {
    const payload = {
      billingMonth: selectedMonth.value,
      readings: pendingRows.map(row => ({
        roomId: row.roomId,
        waterCurrUnit: Number(row.waterCurrUnit || 0),
        waterUnitRate: Number(waterRate.value || 17),
        electricityCurrUnit: Number(row.electricityCurrUnit || 0),
        electricityUnitRate: Number(electricityRate.value || 7)
      }))
    };
    await api.batchRecordMeters(payload);
    saveSuccess.value = true;
    await loadData();
    alert(`บันทึกมิเตอร์ ${pendingRows.length} ห้องเรียบร้อยแล้ว`);
  } catch (err) {
    alert(err.data?.message || 'เกิดข้อผิดพลาดในการบันทึกมิเตอร์');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-lucide-gauge" class="w-6 h-6 text-primary-500" />
          จดมิเตอร์น้ำและไฟฟ้า
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          บันทึกเลขมิเตอร์ประจำเดือน เพื่อนำไปคำนวณค่าน้ำ-ไฟในบิลค่าเช่าอัตโนมัติ
        </p>
      </div>

      <!-- Action Button -->
      <div class="flex items-center gap-2">
        <button
          v-if="allRecorded"
          disabled
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-not-allowed"
        >
          <UIcon name="i-lucide-check-circle-2" class="w-4 h-4 text-emerald-600" />
          จดครบทุกห้องแล้ว ({{ meterRows.length }} ห้อง)
        </button>

        <button
          v-else
          :disabled="saving"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
          @click="handleSaveAll"
        >
          <UIcon :name="saving ? 'i-lucide-loader-2' : 'i-lucide-save'" :class="saving ? 'animate-spin' : ''" class="w-4 h-4" />
          บันทึกมิเตอร์ที่ยังไม่ได้จด ({{ unrecordedCount }} ห้อง)
        </button>
      </div>
    </div>

    <!-- Status Cards & Rate Selector -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- Total Rooms -->
      <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase">ห้องทั้งหมด</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ meterRows.length }} <span class="text-xs font-normal text-slate-400">ห้อง</span></p>
        </div>
        <div class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
          <UIcon name="i-lucide-building" class="w-5 h-5" />
        </div>
      </div>

      <!-- Recorded -->
      <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">จดแล้ว (เสร็จสิ้น)</p>
          <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{{ recordedCount }} <span class="text-xs font-normal text-slate-400">ห้อง</span></p>
        </div>
        <div class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
          <UIcon name="i-lucide-check-circle" class="w-5 h-5" />
        </div>
      </div>

      <!-- Unrecorded -->
      <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">ยังไม่ได้จด</p>
          <p class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{{ unrecordedCount }} <span class="text-xs font-normal text-slate-400">ห้อง</span></p>
        </div>
        <div class="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600">
          <UIcon name="i-lucide-clock" class="w-5 h-5" />
        </div>
      </div>

      <!-- Month Picker -->
      <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-center">
        <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">รอบประจำเดือน</label>
        <input
          v-model="selectedMonth"
          type="month"
          class="w-full px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
        />
      </div>
    </div>

    <!-- Rate & Filter Controls -->
    <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-4">
        <!-- Water Rate -->
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-blue-600 dark:text-blue-400">💧 ค่าน้ำ:</span>
          <input
            v-model="waterRate"
            type="number"
            min="0"
            class="w-20 px-2 py-1 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-bold"
          />
          <span class="text-xs text-slate-500">฿/หน่วย</span>
        </div>

        <!-- Electricity Rate -->
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-amber-600 dark:text-amber-400">⚡ ค่าไฟ:</span>
          <input
            v-model="electricityRate"
            type="number"
            min="0"
            class="w-20 px-2 py-1 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-bold"
          />
          <span class="text-xs text-slate-500">฿/หน่วย</span>
        </div>
      </div>

      <!-- Quick Filter -->
      <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
        <button
          class="px-3 py-1 text-xs font-semibold rounded-md transition"
          :class="filterStatus === 'all' ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'"
          @click="filterStatus = 'all'"
        >
          ทั้งหมด ({{ meterRows.length }})
        </button>
        <button
          class="px-3 py-1 text-xs font-semibold rounded-md transition"
          :class="filterStatus === 'unrecorded' ? 'bg-white dark:bg-slate-900 shadow-xs text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700'"
          @click="filterStatus = 'unrecorded'"
        >
          ยังไม่ได้จด ({{ unrecordedCount }})
        </button>
        <button
          class="px-3 py-1 text-xs font-semibold rounded-md transition"
          :class="filterStatus === 'recorded' ? 'bg-white dark:bg-slate-900 shadow-xs text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700'"
          @click="filterStatus = 'recorded'"
        >
          จดแล้ว ({{ recordedCount }})
        </button>
      </div>
    </div>

    <!-- Meter Table -->
    <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      <div v-if="loading" class="py-12 text-center text-slate-400">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
        <p class="text-sm">กำลังโหลดข้อมูลมิเตอร์...</p>
      </div>

      <div v-else-if="filteredRows.length === 0" class="py-12 text-center text-slate-400">
        <UIcon name="i-lucide-inbox" class="w-10 h-10 mx-auto mb-2 text-slate-300" />
        <p class="text-sm font-medium">ไม่พบรายการห้องพักตามตัวกรองที่เลือก</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead class="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="px-4 py-3.5">ห้องพัก</th>
              <th class="px-4 py-3.5">ผู้เช่า</th>
              <th class="px-4 py-3.5">สถานะ</th>
              <th class="px-4 py-3.5 bg-blue-50/50 dark:bg-blue-950/20">มิเตอร์น้ำ (ก่อน)</th>
              <th class="px-4 py-3.5 bg-blue-50/50 dark:bg-blue-950/20">มิเตอร์น้ำ (ครั้งนี้)</th>
              <th class="px-4 py-3.5 bg-blue-50/50 dark:bg-blue-950/20">หน่วยน้ำ</th>
              <th class="px-4 py-3.5 bg-amber-50/50 dark:bg-amber-950/20">มิเตอร์ไฟ (ก่อน)</th>
              <th class="px-4 py-3.5 bg-amber-50/50 dark:bg-amber-950/20">มิเตอร์ไฟ (ครั้งนี้)</th>
              <th class="px-4 py-3.5 bg-amber-50/50 dark:bg-amber-950/20">หน่วยไฟ</th>
              <th class="px-4 py-3.5 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="row in filteredRows"
              :key="row.roomId"
              class="transition"
              :class="row.isRecorded && !row.isEditing ? 'bg-slate-50/40 dark:bg-slate-900/40' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'"
            >
              <!-- Room Number -->
              <td class="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                ห้อง {{ row.roomNumber }}
                <span class="block text-[11px] font-normal text-slate-400">ชั้น {{ row.floor }} • {{ row.buildingName }}</span>
              </td>

              <!-- Tenant Name -->
              <td class="px-4 py-3.5 text-xs">
                <span :class="row.hasTenant ? 'font-medium text-slate-800 dark:text-slate-200' : 'text-slate-400 italic'">
                  {{ row.tenantName }}
                </span>
              </td>

              <!-- Status Badge -->
              <td class="px-4 py-3.5">
                <span
                  v-if="row.hasInvoice"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
                >
                  <UIcon name="i-lucide-file-check" class="w-3 h-3" />
                  ออกบิลแล้ว
                </span>
                <span
                  v-else-if="row.isRecorded && !row.isEditing"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                >
                  <UIcon name="i-lucide-check-circle" class="w-3 h-3" />
                  จดแล้ว
                </span>
                <span
                  v-else-if="row.isEditing"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                >
                  <UIcon name="i-lucide-edit-3" class="w-3 h-3" />
                  กำลังแก้ไข
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                >
                  <UIcon name="i-lucide-alert-circle" class="w-3 h-3" />
                  ยังไม่จด
                </span>
              </td>

              <!-- Water Prev -->
              <td class="px-4 py-3.5 font-mono text-xs text-slate-500 bg-blue-50/20 dark:bg-blue-950/10">
                {{ row.waterPrevUnit }}
              </td>

              <!-- Water Curr Input -->
              <td class="px-4 py-3.5 bg-blue-50/20 dark:bg-blue-950/10">
                <input
                  v-model="row.waterCurrUnit"
                  type="number"
                  min="0"
                  :disabled="row.isRecorded && !row.isEditing"
                  class="w-24 px-2 py-1 text-sm font-semibold rounded border transition text-center"
                  :class="row.isRecorded && !row.isEditing
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                    : 'border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'"
                />
              </td>

              <!-- Water Usage -->
              <td class="px-4 py-3.5 font-semibold text-blue-600 dark:text-blue-400 text-xs bg-blue-50/20 dark:bg-blue-950/10">
                {{ calculateUsage(row.waterCurrUnit, row.waterPrevUnit) }} หน่วย
                <span class="block text-[10px] text-slate-400 font-normal">฿{{ (calculateUsage(row.waterCurrUnit, row.waterPrevUnit) * waterRate).toLocaleString() }}</span>
              </td>

              <!-- Electricity Prev -->
              <td class="px-4 py-3.5 font-mono text-xs text-slate-500 bg-amber-50/20 dark:bg-amber-950/10">
                {{ row.electricityPrevUnit }}
              </td>

              <!-- Electricity Curr Input -->
              <td class="px-4 py-3.5 bg-amber-50/20 dark:bg-amber-950/10">
                <input
                  v-model="row.electricityCurrUnit"
                  type="number"
                  min="0"
                  :disabled="row.isRecorded && !row.isEditing"
                  class="w-24 px-2 py-1 text-sm font-semibold rounded border transition text-center"
                  :class="row.isRecorded && !row.isEditing
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                    : 'border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'"
                />
              </td>

              <!-- Electricity Usage -->
              <td class="px-4 py-3.5 font-semibold text-amber-600 dark:text-amber-400 text-xs bg-amber-50/20 dark:bg-amber-950/10">
                {{ calculateUsage(row.electricityCurrUnit, row.electricityPrevUnit) }} หน่วย
                <span class="block text-[10px] text-slate-400 font-normal">฿{{ (calculateUsage(row.electricityCurrUnit, row.electricityPrevUnit) * electricityRate).toLocaleString() }}</span>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3.5 text-right">
                <!-- If room already billed -->
                <span v-if="row.hasInvoice" class="text-xs text-slate-400">
                  ล็อก (ออกบิลแล้ว)
                </span>

                <!-- If room is recorded and not editing -->
                <div v-else-if="row.isRecorded && !row.isEditing" class="inline-flex items-center gap-1">
                  <button
                    class="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                    @click="startEditing(row)"
                  >
                    <UIcon name="i-lucide-pencil" class="w-3 h-3" />
                    แก้ไข
                  </button>
                </div>

                <!-- If room is in editing mode -->
                <div v-else-if="row.isEditing" class="inline-flex items-center gap-1">
                  <button
                    class="px-2.5 py-1 text-xs rounded font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                    @click="handleSaveSingle(row)"
                  >
                    บันทึก
                  </button>
                  <button
                    class="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                    @click="cancelEditing(row)"
                  >
                    ยกเลิก
                  </button>
                </div>

                <!-- If room is not yet recorded -->
                <button
                  v-else
                  class="px-3 py-1 text-xs rounded font-medium bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition"
                  @click="handleSaveSingle(row)"
                >
                  บันทึก
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
