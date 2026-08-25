<x-filament-panels::page>
    <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        @foreach ($this->getRoleMatrix() as $role => $permissions)
            <x-filament::section>
                <x-slot name="heading">{{ $role }}</x-slot>
                <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    @foreach ($permissions as $permission)
                        <li class="flex gap-2">
                            <span class="font-bold text-success-500" aria-hidden="true">✓</span>
                            <span>{{ $permission }}</span>
                        </li>
                    @endforeach
                </ul>
            </x-filament::section>
        @endforeach
    </div>
</x-filament-panels::page>
