import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clapperboard,
  Film,
  LibraryBig,
  ListChecks,
  Monitor,
  Play,
  Plus,
  Search,
  Star,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { LandingNav } from "@/components/landing/LandingNav";
import { StashPreview } from "@/components/landing/StashPreview";
import { getShowcasePosters } from "@/lib/showcase";
import loginBg from "../../public/login_bg.png";

const MINI_POSTERS = [
  "from-[#fb923c] via-[#9a3412] to-[#1c1917]",
  "from-[#22d3ee] via-[#0e7490] to-[#082f49]",
  "from-[#a78bfa] via-[#4c1d95] to-[#12071f]",
];

const STATUS_ROWS = [
  { key: "watching", count: 12, dot: "bg-emerald-400" },
  { key: "plan_to_watch", count: 84, dot: "bg-violet-400" },
  { key: "on_hold", count: 8, dot: "bg-orange-400" },
  { key: "completed", count: 24, dot: "bg-blue-400" },
] as const;

const TYPE_CHIPS = [
  { key: "movie", icon: Film },
  { key: "series", icon: Tv },
  { key: "anime", icon: Monitor },
] as const;

function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent ${className}`}
    >
      <span className="h-px w-8 bg-accent/60" />
      {children}
    </p>
  );
}

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  body: string;
  children?: ReactNode;
  className?: string;
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  children,
  className = "",
}: FeatureCardProps) {
  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-surface/70 to-surface/30 p-6 transition-colors duration-300 hover:border-accent/25 ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/[0.04] blur-3xl transition-colors duration-500 group-hover:bg-accent/[0.08]"
      />
      <div className="relative flex h-full flex-col">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent/15 bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="mt-5 text-base font-semibold text-primary">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
          {body}
        </p>
        {children ? <div className="mt-auto pt-6">{children}</div> : null}
      </div>
    </article>
  );
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "landing" });
  const tType = await getTranslations({ locale, namespace: "type" });
  const tStatus = await getTranslations({ locale, namespace: "status" });
  const showcase = await getShowcasePosters(6);
  const miniPosters = showcase.slice(0, 3);
  const searchResult = showcase[3] ?? showcase[0];
  const searchResultMeta = searchResult
    ? [
        tType(searchResult.mediaType === "tv" ? "series" : "movie"),
        searchResult.year,
      ]
        .filter(Boolean)
        .join(" · ")
    : t("features.searchResultMeta");
  const marquee = t.raw("marquee") as string[];
  const year = new Date().getFullYear();

  const trustItems = [
    t("hero.trustFree"),
    t("hero.trustCard"),
    t("hero.trustSignIn"),
  ];

  const steps = [
    { title: t("how.oneTitle"), body: t("how.oneBody") },
    { title: t("how.twoTitle"), body: t("how.twoBody") },
    { title: t("how.threeTitle"), body: t("how.threeBody") },
  ];

  const faqs = [
    { question: t("faq.freeQ"), answer: t("faq.freeA") },
    { question: t("faq.trackQ"), answer: t("faq.trackA") },
    { question: t("faq.syncQ"), answer: t("faq.syncA") },
    { question: t("faq.phoneQ"), answer: t("faq.phoneA") },
    { question: t("faq.dataQ"), answer: t("faq.dataA") },
  ];

  return (
    <main className="overflow-x-hidden bg-canvas">
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Image
            src={loginBg}
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-105 object-cover object-center opacity-50"
          />
          <div className="absolute inset-0 bg-canvas/30" />
          <div className="absolute inset-0 bg-gradient-to-b from-canvas/75 via-canvas/25 to-canvas" />
          <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/45 to-transparent lg:via-canvas/20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,rgba(10,10,10,0.55)_78%,#0a0a0a_100%)]" />
        </div>

        <LandingNav />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-24 pt-32 sm:px-6 lg:min-h-[92svh] lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-20 lg:pt-28">
          <div
            className="animate-fade-up lg:col-span-6 xl:col-span-5"
            style={{ animationDelay: "60ms" }}
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(245,158,11,0.9)]" />
              {t("hero.eyebrow")}
            </p>

            <h1
              id="hero-title"
              className="mt-6 font-display text-[clamp(3.5rem,7.5vw,6.5rem)] uppercase leading-[0.82] tracking-[0.01em] text-primary"
            >
              <span className="block">{t("hero.titleTop")}</span>
              <span className="block text-accent">{t("hero.titleBottom")}</span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-relaxed text-secondary sm:text-lg">
              {t("hero.description")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-canvas shadow-[0_0_30px_rgba(245,158,11,0.22)] transition-all duration-200 hover:bg-accent-hover hover:shadow-[0_0_40px_rgba(245,158,11,0.32)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                {t("hero.primaryCta")}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 text-sm font-medium text-primary backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                {t("hero.secondaryCta")}
                <ArrowDown className="h-4 w-4 text-muted" />
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
              {trustItems.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="animate-fade-up lg:col-span-6 xl:col-span-7"
            style={{ animationDelay: "180ms" }}
          >
            <StashPreview locale={locale} />
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-canvas to-transparent"
        />
      </section>

      <div
        aria-hidden
        className="relative flex overflow-hidden border-y border-white/[0.06] bg-surface/25 py-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      >
        <div className="animate-marquee flex w-max shrink-0 items-center">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {marquee.map((item, index) => (
                <span
                  key={`${copy}-${index}`}
                  className="flex items-center gap-8 pr-8 font-display text-2xl uppercase tracking-[0.12em] text-white/25 sm:text-3xl"
                >
                  {item}
                  <span className="text-accent/50">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section
        id="features"
        aria-labelledby="features-title"
        className="relative scroll-mt-24 py-24 sm:py-32"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Eyebrow>{t("features.eyebrow")}</Eyebrow>
              <h2
                id="features-title"
                className="mt-5 max-w-2xl font-display text-[clamp(2.75rem,5vw,4.5rem)] uppercase leading-[0.9] tracking-[0.01em] text-primary"
              >
                {t("features.title")}
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-secondary lg:col-span-5 lg:pb-2">
              {t("features.description")}
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-6">
            <FeatureCard
              className="md:col-span-4"
              icon={LibraryBig}
              title={t("features.libraryTitle")}
              body={t("features.libraryBody")}
            >
              <div
                aria-hidden
                className="flex flex-wrap items-end justify-between gap-5"
              >
                <div className="flex items-end gap-2">
                  {miniPosters.length > 0
                    ? miniPosters.map((poster, index) => (
                        <span
                          key={poster.id}
                          className={`relative h-24 w-16 overflow-hidden rounded-md border border-white/10 bg-surface shadow-lg shadow-black/40 ${
                            index === 1 ? "-translate-y-3" : ""
                          }`}
                        >
                          <Image
                            src={poster.posterUrl}
                            alt=""
                            fill
                            unoptimized
                            sizes="64px"
                            className="object-cover"
                          />
                        </span>
                      ))
                    : MINI_POSTERS.map((gradient, index) => (
                        <span
                          key={gradient}
                          className={`h-24 w-16 rounded-md border border-white/10 bg-gradient-to-br shadow-lg shadow-black/40 ${gradient} ${
                            index === 1 ? "-translate-y-3" : ""
                          }`}
                        />
                      ))}
                  <span className="flex h-24 w-16 items-center justify-center rounded-md border border-dashed border-white/10 text-[10px] text-white/30">
                    +125
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {TYPE_CHIPS.map(({ key, icon: TypeIcon }) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[10px] font-medium text-secondary"
                    >
                      <TypeIcon className="h-3 w-3 text-accent" />
                      {tType(key)}
                    </span>
                  ))}
                </div>
              </div>
            </FeatureCard>

            <FeatureCard
              className="md:col-span-2"
              icon={ListChecks}
              title={t("features.statusTitle")}
              body={t("features.statusBody")}
            >
              <div aria-hidden className="space-y-2">
                {STATUS_ROWS.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${row.dot}`} />
                    <span className="text-xs text-secondary">
                      {tStatus(row.key)}
                    </span>
                    <span className="ml-auto text-[10px] tabular-nums text-white/30">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            </FeatureCard>

            <FeatureCard
              className="md:col-span-2"
              icon={Search}
              title={t("features.searchTitle")}
              body={t("features.searchBody")}
            >
              <div aria-hidden>
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5">
                  <Search className="h-3.5 w-3.5 text-white/40" />
                  <span className="text-xs text-white/40">
                    {t("features.searchPlaceholder")}
                  </span>
                  <span className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/30">
                    ⌘K
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-accent/15 bg-accent/[0.04] p-2.5">
                  {searchResult ? (
                    <span className="relative h-10 w-7 shrink-0 overflow-hidden rounded bg-surface">
                      <Image
                        src={searchResult.posterUrl}
                        alt=""
                        fill
                        unoptimized
                        sizes="28px"
                        className="object-cover"
                      />
                    </span>
                  ) : (
                    <span className="h-10 w-7 shrink-0 rounded bg-gradient-to-br from-orange-500 via-red-900 to-black" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-primary">
                      {searchResult
                        ? searchResult.title
                        : t("features.searchResultTitle")}
                    </span>
                    <span className="block truncate text-[10px] text-muted">
                      {searchResultMeta}
                    </span>
                  </span>
                  <Plus className="ml-auto h-4 w-4 shrink-0 text-accent" />
                </div>
              </div>
            </FeatureCard>

            <FeatureCard
              className="md:col-span-2"
              icon={Star}
              title={t("features.ratingTitle")}
              body={t("features.ratingBody")}
            >
              <div aria-hidden>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 10 }, (_, index) => (
                    <Star
                      key={index}
                      className={`h-3.5 w-3.5 ${
                        index < 9
                          ? "fill-rating text-rating"
                          : "fill-rating/30 text-rating"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-xs font-semibold tabular-nums text-rating">
                    9.2
                  </span>
                </div>
                <p className="mt-3 border-l-2 border-white/10 pl-3 text-xs italic leading-relaxed text-muted">
                  {t("features.ratingNote")}
                </p>
              </div>
            </FeatureCard>

            <FeatureCard
              className="md:col-span-2"
              icon={Clapperboard}
              title={t("features.progressTitle")}
              body={t("features.progressBody")}
            >
              <div aria-hidden>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-secondary">
                    {t("features.progressMeta")}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted">40%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[40%] rounded-full bg-accent" />
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
                  <Play className="h-3 w-3 fill-accent" />
                  {t("features.progressAction")}
                </div>
              </div>
            </FeatureCard>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="manifesto-title"
        className="relative border-y border-white/[0.06] bg-surface/30 py-20 sm:py-24"
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.06),transparent_65%)]"
        />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <Eyebrow className="justify-center">
            {t("manifesto.eyebrow")}
          </Eyebrow>
          <h2
            id="manifesto-title"
            aria-label={`${t("manifesto.lead")} ${t("manifesto.strike")}. ${t("manifesto.middle")} ${t("manifesto.accent")}`}
            className="mt-6 font-display text-[clamp(2.25rem,5vw,4rem)] uppercase leading-[0.95] text-primary"
          >
            <span className="block">
              {t("manifesto.lead")}{" "}
              <span className="text-muted line-through decoration-accent/40 decoration-[3px]">
                {t("manifesto.strike")}
              </span>
              .
            </span>{" "}
            <span className="block">
              {t("manifesto.middle")}{" "}
              <span className="text-accent">{t("manifesto.accent")}</span>
            </span>
          </h2>
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-title"
        className="relative scroll-mt-24 py-24 sm:py-32"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Eyebrow>{t("how.eyebrow")}</Eyebrow>
              <h2
                id="how-title"
                className="mt-5 max-w-2xl font-display text-[clamp(2.75rem,5vw,4.5rem)] uppercase leading-[0.9] tracking-[0.01em] text-primary"
              >
                {t("how.title")}
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-secondary lg:col-span-5 lg:pb-2">
              {t("how.description")}
            </p>
          </div>

          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
            {steps.map((step, index) => (
              <li key={step.title} className="relative">
                <div className="flex items-center gap-4">
                  <span className="font-display text-5xl leading-none text-accent">
                    0{index + 1}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-accent/40 to-transparent" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="faq"
        aria-labelledby="faq-title"
        className="relative scroll-mt-24 border-t border-white/[0.06] py-24 sm:py-32"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
          <div className="lg:col-span-4">
            <Eyebrow>{t("faq.eyebrow")}</Eyebrow>
            <h2
              id="faq-title"
              className="mt-5 font-display text-[clamp(2.75rem,5vw,4.5rem)] uppercase leading-[0.9] tracking-[0.01em] text-primary"
            >
              {t("faq.title")}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-secondary">
              {t("faq.description")}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              {t("hero.primaryCta")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mx-6 lg:col-span-8">
            <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {faqs.map((faq) => (
                <details key={faq.question} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base font-medium text-primary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <Plus className="h-4 w-4 shrink-0 text-muted transition-transform duration-300 group-open:rotate-45 group-open:text-accent" />
                  </summary>
                  <p className="max-w-2xl pb-5 pr-10 text-sm leading-relaxed text-secondary">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="cta-title" className="relative overflow-hidden py-24 sm:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Image
            src={loginBg}
            alt=""
            fill
            sizes="100vw"
            className="scale-x-[-1] object-cover object-center opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-canvas via-canvas/60 to-canvas" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-b from-surface/90 to-canvas/90 px-6 py-14 text-center shadow-2xl shadow-black/50 backdrop-blur-md sm:px-12 sm:py-20">
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
                {t("cta.eyebrow")}
              </p>
              <h2
                id="cta-title"
                className="mx-auto mt-5 max-w-2xl font-display text-[clamp(2.5rem,5.5vw,4.5rem)] uppercase leading-[0.9] text-primary"
              >
                {t("cta.title")}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-secondary sm:text-base">
                {t("cta.description")}
              </p>
              <Link
                href="/login"
                className="group mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-7 text-sm font-semibold text-canvas shadow-[0_0_30px_rgba(245,158,11,0.22)] transition-all duration-200 hover:bg-accent-hover hover:shadow-[0_0_40px_rgba(245,158,11,0.32)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                {t("cta.button")}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <p className="mt-4 text-[11px] text-subtle">{t("cta.note")}</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] bg-canvas">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <Image
                  src="/512×512_icon.png"
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-lg ring-1 ring-white/10"
                />
                <span className="text-[17px] font-bold tracking-tight text-primary">
                  WatchStash<span className="text-accent">.</span>
                </span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
                {t("footer.tagline")}
              </p>
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">
                {t("footer.product")}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link
                    href="/app"
                    className="text-secondary transition-colors hover:text-primary"
                  >
                    {t("footer.discover")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/app/tracker"
                    className="text-secondary transition-colors hover:text-primary"
                  >
                    {t("footer.tracker")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="text-secondary transition-colors hover:text-primary"
                  >
                    {t("footer.signIn")}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">
                {t("footer.legal")}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link
                    href="/terms"
                    className="text-secondary transition-colors hover:text-primary"
                  >
                    {t("footer.terms")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-secondary transition-colors hover:text-primary"
                  >
                    {t("footer.privacy")}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-3">
              <p className="text-[11px] leading-relaxed text-subtle">
                {t("footer.tmdb")}
              </p>
              <a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                The Movie Database
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-[11px] text-subtle sm:flex-row sm:items-center sm:justify-between">
            <p>{t("footer.copyright", { year })}</p>
            <p>{t("footer.closer")}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
