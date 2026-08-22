import { Head } from '@inertiajs/react';

type Seo = {
    title: string; description: string; canonical: string; image?: string | null; robots?: string;
    ogType?: 'product' | 'website' | 'article'; ogTitle?: string | null; ogDescription?: string | null; ogImage?: string | null;
    twitterTitle?: string | null; twitterDescription?: string | null; twitterImage?: string | null;
};

export default function SeoHead({ seo, jsonLd }: { seo: Seo; jsonLd?: Record<string, unknown> }) {
    return <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="robots" content={seo.robots ?? 'index,follow'} />
        <link rel="canonical" href={seo.canonical} />
        <meta property="og:type" content={seo.ogType ?? 'website'} />
        <meta property="og:title" content={seo.ogTitle || seo.title} />
        <meta property="og:description" content={seo.ogDescription || seo.description} />
        <meta property="og:url" content={seo.canonical} />
        {(seo.ogImage || seo.image) && <meta property="og:image" content={(seo.ogImage || seo.image)!} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.twitterTitle || seo.ogTitle || seo.title} />
        <meta name="twitter:description" content={seo.twitterDescription || seo.ogDescription || seo.description} />
        {(seo.twitterImage || seo.ogImage || seo.image) && <meta name="twitter:image" content={(seo.twitterImage || seo.ogImage || seo.image)!} />}
        {jsonLd && Object.entries(jsonLd).map(([key, value]) => <script key={key} type="application/ld+json">{JSON.stringify(value)}</script>)}
    </Head>;
}
