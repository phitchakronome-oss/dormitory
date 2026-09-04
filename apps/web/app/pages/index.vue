<script setup>
const api = useApi();

const loading = ref(true);
const stats = ref({
  totalRooms: 0,
  vacantRooms: 0,
  occupiedRooms: 0,
  maintenanceRooms: 0,
  totalTenants: 0,
  pendingInvoicesCount: 0,
  pendingTotalAmount: 0
});

const rooms = ref([]);
const buildings = ref([]);
const selectedBuilding = ref('ALL');
const selectedStatus = ref('ALL');

const loadDashboard = async () => {
  loading.value = true;
  try {
    const [statsRes, roomsRes, buildingsRes] = await Promise.allSettled([
      api.getDashboardStats(),
      api.getRooms(),
      api.getBuildings()
    ]);

    if (statsRes.status === 'fulfilled' && statsRes.value) {
      stats.value = statsRes.value;
    }
    if (roomsRes.status === 'fulfilled' && Array.isArray(roomsRes.value)) {
      rooms.value = roomsRes.value;
    }
    if (buildingsRes.status === 'fulfilled' && Array.isArray(buildingsRes.value)) {
      buildings.value = buildingsRes.value;
    }
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadDashboard();
});

const filteredRooms = computed(() => {
  return rooms.value.filter(room => {
    const matchBuilding = selectedBuilding.value === 'ALL' || room.buildingId === selectedBuilding.value;
    const matchStatus = selectedStatus.value === 'ALL' || room.status === selectedStatus.value;
    return matchBuilding && matchStatus;
  });
});

const groupedByFloor = computed(() => {
  const map = new Map();
  filteredRooms.value.forEach(room => {
    const floor = Number(room.floor) || 1;
    if (!map.has(floor)) {
      map.set(floor, []);
    }
    map.get(floor).push(room);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([floor, floorRooms]) => ({
      floor,
      rooms: floorRooms.sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }))
    }));
});

const getStatusBadge = (status) => {
  switch (status) {
    case 'VACANT':
      return { label: 'ห้องว่าง', color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300' };
    case 'OCCUPIED':
      return { label: 'มีผู้เช่า', color: 'blue', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 text-blue-700 dark:text-blue-300' };
    case 'MAINTENANCE':
      return { label: 'ซ่อมบำรุง', color: 'amber', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-700 dark:text-amber-300' };
    default:
      return { label: status, color: 'neutral', bg: 'bg-slate-100 border-slate-300 text-slate-700' };
  }
};
</script>

<template>
  <div class="space-y-8">
    <!-- Hero / Welcome Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          ภาพรวมระบบจัดการหอพัก
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          ยินดีต้อนรับสู่ระบบบริหารจัดการหอพัก ตรวจสอบสถานะห้อง ผู้เช่า และรายรับได้ทันที
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          to="/meters"
          icon="i-lucide-gauge"
          color="primary"
          variant="subtle"
          label="จดมิเตอร์"
        />
        <UButton
          to="/invoices"
          icon="i-lucide-receipt"
          color="primary"
          variant="subtle"
          label="ออกบิลค่าเช่า"
        />
        <UButton
          to="/rooms"
          icon="i-lucide-plus"
          color="primary"
          label="จัดการห้องพัก"
        />
      </div>
    </div>

    <!-- KPI Statistics Cards Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Rooms -->
      <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
          <UIcon name="i-lucide-building" class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">ห้องพักทั้งหมด</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{{ stats.totalRooms }} <span class="text-xs font-normal text-slate-500">ห้อง</span></p>
        </div>
      </div>

      <!-- Vacant Rooms -->
      <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-emerald-100 dark:border-emerald-950/60 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <UIcon name="i-lucide-door-open" class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-medium text-emerald-600 dark:text-emerald-400">ห้องว่างพร้อมเช่า</p>
          <p class="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{{ stats.vacantRooms }} <span class="text-xs font-normal text-slate-500">ห้อง</span></p>
        </div>
      </div>

      <!-- Occupied Rooms -->
      <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-blue-100 dark:border-blue-950/60 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
          <UIcon name="i-lucide-user-check" class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-medium text-blue-600 dark:text-blue-400">ห้องมีผู้เช่าอยู่</p>
          <p class="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">{{ stats.occupiedRooms }} <span class="text-xs font-normal text-slate-500">ห้อง</span></p>
        </div>
      </div>

      <!-- Pending Invoices / Unpaid -->
      <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-rose-100 dark:border-rose-950/60 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
          <UIcon name="i-lucide-alert-circle" class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-medium text-rose-600 dark:text-rose-400">ค้างชำระ ({{ stats.pendingInvoicesCount }} บิล)</p>
          <p class="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-0.5">฿{{ Number(stats.pendingTotalAmount || 0).toLocaleString() }}</p>
        </div>
      </div>
    </div>

    <!-- Visual Room Grid Section -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-lucide-layout-grid" class="w-5 h-5 text-primary-500" />
            ผังสถานะห้องพัก
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            คลิกดูสถานะห้องพักและรายละเอียดแบบเรียลไทม์
          </p>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Building Filter -->
          <select
            v-model="selectedBuilding"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">ทุกอาคาร</option>
            <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>

          <!-- Status Filter -->
          <select
            v-model="selectedStatus"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="VACANT">ห้องว่าง</option>
            <option value="OCCUPIED">มีผู้เช่า</option>
            <option value="MAINTENANCE">ซ่อมบำรุง</option>
          </select>

          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="loading"
            @click="loadDashboard"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-12 text-center text-slate-400">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
        <p class="text-sm">กำลังโหลดข้อมูลห้องพัก...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="groupedByFloor.length === 0" class="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
        <UIcon name="i-lucide-bed" class="w-10 h-10 mx-auto mb-2 text-slate-400" />
        <p class="text-sm font-medium text-slate-600 dark:text-slate-300">ยังไม่มีข้อมูลห้องพัก</p>
        <p class="text-xs text-slate-400 mt-1">สามารถเริ่มต้นเพิ่มตึกและห้องพักได้ที่หน้า "จัดการห้องพัก"</p>
        <UButton to="/rooms" class="mt-4" size="xs" label="ไปที่หน้าห้องพัก" />
      </div>

      <!-- Rooms Grouped by Floor -->
      <div v-else class="space-y-6">
        <div v-for="group in groupedByFloor" :key="group.floor" class="space-y-3">
          <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary-600 text-white font-bold text-xs shadow-xs">
              {{ group.floor }}
            </span>
            <span class="font-bold text-sm text-slate-800 dark:text-slate-200">ชั้น {{ group.floor }}</span>
            <span class="text-xs text-slate-400">({{ group.rooms.length }} ห้อง)</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div
              v-for="room in group.rooms"
              :key="room.id"
              class="p-3.5 rounded-xl border transition hover:shadow-md cursor-pointer flex flex-col justify-between"
              :class="getStatusBadge(room.status).bg"
            >
              <div>
                <div class="flex items-center justify-between">
                  <span class="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                    {{ room.roomNumber }}
                  </span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded font-medium border" :class="getStatusBadge(room.status).bg">
                    {{ getStatusBadge(room.status).label }}
                  </span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {{ room.building?.name || 'ตึกหลัก' }}
                </p>
              </div>

              <div class="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div v-if="room.contracts && room.contracts.length > 0" class="flex items-center gap-1 text-slate-700 dark:text-slate-300 truncate">
                  <UIcon name="i-lucide-user" class="w-3 h-3 text-slate-400 shrink-0" />
                  <span class="truncate">{{ room.contracts[0].tenant ? (room.contracts[0].tenant.firstName + ' ' + room.contracts[0].tenant.lastName) : 'ผู้เช่า' }}</span>
                </div>
                <div v-else class="text-slate-400 text-[11px]">
                  ฿{{ Number(room.monthlyRent || room.baseRent || 0).toLocaleString() }}/ด.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
