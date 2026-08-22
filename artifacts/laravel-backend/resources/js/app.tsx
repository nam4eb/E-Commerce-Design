import { createInertiaApp } from '@inertiajs/react';
import { hydrateRoot } from 'react-dom/client';
import { resolvePageComponent } from './pages';
import { CompareProvider } from './Components/Compare';

const app = document.getElementById('app');

if (app) {
    void createInertiaApp({
        resolve: (name: string) => resolvePageComponent(name),
        setup({ el, App, props }) {
            hydrateRoot(el, <CompareProvider><App {...props} /></CompareProvider>);
            el.dataset.hydrated = 'true';
        },
    }).catch((error) => console.error('Inertia bootstrap failed', error));
}
