import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle } from "lucide-react";

import { getPublicCheckout, type PublicCheckoutData } from "@/lib/public-checkout.functions";
import { CheckoutView } from "@/components/checkout/CheckoutView";

export const Route = createFileRoute("/checkout/$token")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(checkoutQuery(params.token));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Checkout indisponível" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const scripts: Array<{ children: string }> = [];
    if (loaderData.tracking?.meta_pixel_id) {
      scripts.push({
        children: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${loaderData.tracking.meta_pixel_id}');
fbq('track', 'PageView');
        `.trim(),
      });
    }
    if (loaderData.tracking?.ga_measurement_id) {
      scripts.push({
        children: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${loaderData.tracking.ga_measurement_id}');
        `.trim(),
      });
    }
    return {
      meta: [
        { title: `${loaderData.product.title} — Checkout` },
        { name: "description", content: loaderData.product.description ?? loaderData.offer.name },
        { property: "og:title", content: loaderData.product.title },
        { property: "og:type", content: "product" },
      ],
      links: [{ rel: "canonical", href: `https://paglinkapp.com.br/checkout/${loaderData.offer.checkout_token}` }],
      scripts,
    };
  },
  component: PublicCheckoutPage,
  notFoundComponent: NotAvailable,
  errorComponent: NotAvailable,
});

function checkoutQuery(token: string) {
  return queryOptions({
    queryKey: ["public-checkout", token],
    queryFn: () => getPublicCheckout({ data: { token } }),
    staleTime: 30_000,
  });
}

function PublicCheckoutPage() {
  const { token } = Route.useParams();
  const fetchFn = useServerFn(getPublicCheckout);
  const { data } = useSuspenseQuery({
    queryKey: ["public-checkout", token],
    queryFn: () => fetchFn({ data: { token } }),
  });

  if (!data) return <NotAvailable />;

  return (
    <CheckoutView
      data={{
        product: data.product,
        offer: data.offer,
        settings: data.settings,
        payment_methods: data.payment_methods,
        order_bump: data.order_bump,
      }}
    />
  );
}

function NotAvailable() {
  return (
    <div className="grid min-h-screen place-items-center bg-neutral-950 p-8 text-white">
      <div className="max-w-md text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-neutral-500" />
        <h1 className="text-2xl font-bold">Este checkout não está disponível.</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Verifique o link ou entre em contato com o vendedor.
        </p>
      </div>
    </div>
  );
}
