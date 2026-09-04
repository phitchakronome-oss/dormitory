<script setup>
useHead({
  title: 'ระบบจัดการหอพัก | Dormitory Management System',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: 'ระบบบริหารจัดการหอพักและอพาร์ตเมนต์ อัจฉริยะ ครบวงจร' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'th'
  }
});

const route = useRoute();

const navItems = [
  { label: 'ภาพรวม', icon: 'i-lucide-layout-dashboard', to: '/' },
  { label: 'ห้องพัก', icon: 'i-lucide-bed-double', to: '/rooms' },
  { label: 'ผู้เช่าและสัญญา', icon: 'i-lucide-users', to: '/tenants' },
  { label: 'จดมิเตอร์น้ำ-ไฟ', icon: 'i-lucide-gauge', to: '/meters' },
  { label: 'บิลและชำระเงิน', icon: 'i-lucide-receipt', to: '/invoices' }
];
</script>

<template>
  <UApp>
    <div class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <!-- Top Navigation Header -->
      <header class="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <!-- Logo & Brand -->
          <div class="flex items-center gap-6">
            <NuxtLink to="/" class="flex items-center gap-2.5 font-bold text-lg text-primary-600 dark:text-primary-400">
              <div class="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-md">
                <UIcon name="i-lucide-building-2" class="w-5 h-5 text-white" />
              </div>
              <div class="flex flex-col leading-tight">
                <span class="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Dormitory Pro</span>
                <span class="text-xs text-slate-500 dark:text-slate-400 font-normal">ระบบจัดการหอพัก</span>
              </div>
            </NuxtLink>

            <!-- Desktop Nav Links -->
            <nav class="hidden md:flex items-center gap-1">
              <NuxtLink
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                :class="[
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                  route.path === item.to
                    ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                ]"
              >
                <UIcon :name="item.icon" class="w-4 h-4" />
                {{ item.label }}
              </NuxtLink>
            </nav>
          </div>

          <!-- Right Actions -->
          <div class="flex items-center gap-3">
            <UColorModeButton />
          </div>
        </div>

        <!-- Mobile Nav Scroll -->
        <div class="md:hidden flex items-center gap-2 px-4 py-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :class="[
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1.5 shrink-0',
              route.path === item.to
                ? 'bg-primary-600 text-white font-semibold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            ]"
          >
            <UIcon :name="item.icon" class="w-3.5 h-3.5" />
            {{ item.label }}
          </NuxtLink>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <NuxtPage />
      </main>

      <!-- Footer -->
      <footer class="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div class="max-w-7xl mx-auto px-4">
          ระบบบริหารจัดการหอพัก Dormitory Pro • เชื่อมต่อ NestJS Backend & PostgreSQL
        </div>
      </footer>
    </div>
  </UApp>
</template>
