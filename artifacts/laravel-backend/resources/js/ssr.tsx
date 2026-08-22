import { createInertiaApp } from '@inertiajs/react';
import { renderToString } from 'react-dom/server';
import createServer from '@inertiajs/react/server';
import { resolvePageComponent } from './pages';
import { CompareProvider } from './Components/Compare';

createServer((page) =>
    createInertiaApp({
        page,
        render: renderToString,
        resolve(name) {
            return resolvePageComponent(name);
        },
        setup({ App, props }) {
            return <CompareProvider><App {...props} /></CompareProvider>;
        },
    }),
);
