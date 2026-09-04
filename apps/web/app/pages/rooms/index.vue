<script setup>
const api = useApi();

const loading = ref(true);
const rooms = ref([]);
const buildings = ref([]);
const selectedBuilding = ref('ALL');
const selectedStatus = ref('ALL');
const selectedFloor = ref('ALL');

// Modals
const showAddRoomModal = ref(false);
const showAddBuildingModal = ref(false);

const roomForm = ref({
  buildingId: '',
  roomNumber: '',
  floor: 1,
  monthlyRent: 3500,
  type: 'FAN',
  status: 'VACANT'
});

const buildingForm = ref({
  name: '',
  totalFloors: 4,
  address: ''
});

const formSubmitting = ref(false);
const errorMessage = ref('');

const loadData = async () => {
  loading.value = true;
  try {
    const [roomsRes, buildingsRes] = await Promise.all([
      api.getRooms(),
      api.getBuildings()
    ]);
    rooms.value = roomsRes || [];
    buildings.value = buildingsRes || [];
    if (buildings.value.length > 0 && !roomForm.value.buildingId) {
      roomForm.value.buildingId = buildings.value[0].id;
    }
  } catch (err) {
    console.error('Error fetching rooms:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});

const availableFloors = computed(() => {
  const floors = new Set(rooms.value.map(r => r.floor).filter(f => f !== undefined && f !== null));
  return Array.from(floors).sort((a, b) => Number(a) - Number(b));
});

const filteredRooms = computed(() => {
  return rooms.value.filter(room => {
    const matchBuilding = selectedBuilding.value === 'ALL' || room.buildingId === selectedBuilding.value;
    const matchStatus = selectedStatus.value === 'ALL' || room.status === selectedStatus.value;
    const matchFloor = selectedFloor.value === 'ALL' || Number(room.floor) === Number(selectedFloor.value);
    return matchBuilding && matchStatus && matchFloor;
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

const handleCreateBuilding = async () => {
  if (!buildingForm.value.name) return;
  formSubmitting.value = true;
  errorMessage.value = '';
  try {
    await api.createBuilding({
      name: buildingForm.value.name,
      totalFloors: Number(buildingForm.value.totalFloors),
      description: buildingForm.value.address || undefined
    });
    showAddBuildingModal.value = false;
    buildingForm.value = { name: '', totalFloors: 4, address: '' };
    await loadData();
  } catch (err) {
    errorMessage.value = err.data?.message || 'ไม่สามารถเพิ่มอาคารได้';
  } finally {
    formSubmitting.value = false;
  }
};

const handleCreateRoom = async () => {
  if (!roomForm.value.roomNumber || !roomForm.value.buildingId) return;
  formSubmitting.value = true;
  errorMessage.value = '';
  try {
    await api.createRoom({
      ...roomForm.value,
      floor: Number(roomForm.value.floor),
      monthlyRent: Number(roomForm.value.monthlyRent)
    });
    showAddRoomModal.value = false;
    roomForm.value.roomNumber = '';
    await loadData();
  } catch (err) {
    errorMessage.value = err.data?.message || 'ไม่สามารถเพิ่มห้องพักได้ (อาจมีเลขห้องซ้ำ)';
  } finally {
    formSubmitting.value = false;
  }
};

const handleDeleteRoom = async (id, roomNumber) => {
  if (!confirm(`ยืนยันการลบห้อง ${roomNumber}?`)) return;
  try {
    await api.deleteRoom(id);
    await loadData();
  } catch (err) {
    alert(err.data?.message || 'ไม่สามารถลบห้องพักได้');
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'VACANT':
      return { label: 'ห้องว่าง', class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
    case 'OCCUPIED':
      return { label: 'มีผู้เช่า', class: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' };
    case 'MAINTENANCE':
      return { label: 'ซ่อมบำรุง', class: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
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
          <UIcon name="i-lucide-bed-double" class="w-6 h-6 text-primary-500" />
          จัดการห้องพักและอาคาร
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          ดูรายการห้องพัก กำหนดค่าเช่า และสถานะห้อง
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-building"
          color="neutral"
          variant="outline"
          label="เพิ่มอาคาร"
          @click="showAddBuildingModal = true"
        />
        <UButton
          icon="i-lucide-plus"
          color="primary"
          label="เพิ่มห้องพัก"
          @click="showAddRoomModal = true"
        />
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-slate-500">อาคาร:</span>
          <select
            v-model="selectedBuilding"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">ทุกอาคาร</option>
            <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-slate-500">ชั้น:</span>
          <select
            v-model="selectedFloor"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">ทุกชั้น</option>
            <option v-for="f in availableFloors" :key="f" :value="f">ชั้น {{ f }}</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-slate-500">สถานะ:</span>
          <select
            v-model="selectedStatus"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="VACANT">ห้องว่าง</option>
            <option value="OCCUPIED">มีผู้เช่า</option>
            <option value="MAINTENANCE">ซ่อมบำรุง</option>
          </select>
        </div>
      </div>

      <div class="text-xs text-slate-500">
        พบห้องพักทั้งหมด {{ filteredRooms.length }} ห้อง
      </div>
    </div>

    <!-- Grouped by Floor Rooms Display -->
    <div v-if="loading" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
      <p class="text-sm">กำลังโหลดข้อมูลห้องพัก...</p>
    </div>

    <div v-else-if="groupedByFloor.length === 0" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
      <UIcon name="i-lucide-bed" class="w-10 h-10 mx-auto mb-2 text-slate-300" />
      <p class="text-sm font-medium">ไม่พบข้อมูลห้องพักตามเงื่อนไขที่เลือก</p>
    </div>

    <div v-else class="space-y-6">
      <div v-for="group in groupedByFloor" :key="group.floor" class="space-y-2.5">
        <!-- Floor Header -->
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2.5">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary-600 text-white font-extrabold text-xs shadow-xs">
              {{ group.floor }}
            </span>
            <h3 class="font-bold text-slate-900 dark:text-white text-base">
              ชั้น {{ group.floor }}
            </h3>
            <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              {{ group.rooms.length }} ห้อง
            </span>
          </div>
        </div>

        <!-- Floor Table -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead class="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="px-5 py-3.5">เลขห้อง</th>
                  <th class="px-5 py-3.5">อาคาร</th>
                  <th class="px-5 py-3.5">ค่าเช่ารายเดือน</th>
                  <th class="px-5 py-3.5">สถานะ</th>
                  <th class="px-5 py-3.5">ผู้เช่าปัจจุบัน</th>
                  <th class="px-5 py-3.5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr v-for="room in group.rooms" :key="room.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                  <td class="px-5 py-4 font-bold text-slate-900 dark:text-white">
                    {{ room.roomNumber }}
                  </td>
                  <td class="px-5 py-4">
                    {{ room.building?.name || '-' }}
                  </td>
                  <td class="px-5 py-4 font-medium">
                    ฿{{ Number(room.monthlyRent || room.baseRent || 0).toLocaleString() }}
                  </td>
                  <td class="px-5 py-4">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold" :class="getStatusBadge(room.status).class">
                      {{ getStatusBadge(room.status).label }}
                    </span>
                  </td>
                  <td class="px-5 py-4">
                    <span v-if="room.contracts && room.contracts.length > 0 && room.contracts[0].tenant" class="font-medium text-slate-800 dark:text-slate-200">
                      {{ room.contracts[0].tenant.firstName }} {{ room.contracts[0].tenant.lastName }}
                    </span>
                    <span v-else class="text-xs text-slate-400">-</span>
                  </td>
                  <td class="px-5 py-4 text-right">
                    <button
                      class="text-xs text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      @click="handleDeleteRoom(room.id, room.roomNumber)"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Building Modal Simple Dialog -->
    <div v-if="showAddBuildingModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">เพิ่มอาคาร / ตึกใหม่</h3>
        <form @submit.prevent="handleCreateBuilding" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ชื่ออาคาร (เช่น ตึก A, หอพัก 1)</label>
            <input v-model="buildingForm.name" required type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">จำนวนชั้น</label>
            <input v-model="buildingForm.totalFloors" type="number" min="1" max="50" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ที่อยู่ / คำอธิบายเพิ่มเติม</label>
            <input v-model="buildingForm.address" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>

          <p v-if="errorMessage" class="text-xs text-rose-500">{{ errorMessage }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="px-4 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100" @click="showAddBuildingModal = false">ยกเลิก</button>
            <button type="submit" :disabled="formSubmitting" class="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">บันทึกอาคาร</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Room Modal Simple Dialog -->
    <div v-if="showAddRoomModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">เพิ่มห้องพักใหม่</h3>
        <form @submit.prevent="handleCreateRoom" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">เลือกอาคาร</label>
            <select v-model="roomForm.buildingId" required class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
              <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">เลขห้อง (เช่น 101, A203)</label>
              <input v-model="roomForm.roomNumber" required type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ชั้น</label>
              <input v-model="roomForm.floor" type="number" min="1" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ค่าเช่ารายเดือน (บาท)</label>
            <input v-model="roomForm.monthlyRent" type="number" min="0" step="100" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">สถานะเริ่มต้น</label>
            <select v-model="roomForm.status" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
              <option value="VACANT">ห้องว่าง (VACANT)</option>
              <option value="OCCUPIED">มีผู้เช่า (OCCUPIED)</option>
              <option value="MAINTENANCE">ซ่อมบำรุง (MAINTENANCE)</option>
            </select>
          </div>

          <p v-if="errorMessage" class="text-xs text-rose-500">{{ errorMessage }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="px-4 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100" @click="showAddRoomModal = false">ยกเลิก</button>
            <button type="submit" :disabled="formSubmitting" class="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">บันทึกห้องพัก</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
