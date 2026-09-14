import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Newspaper,
  ShoppingBag,
  Users,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  Search,
  UserPlus,
  LogIn,
  Sparkles,
  CheckCircle2,
  Zap,
} from "lucide-react";

/* =========================================================
   ANIMATION VARIANTS
========================================================= */

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 35,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const fadeLeft = {
  hidden: {
    opacity: 0,
    x: 50,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Index() {
  return (
    <div className="min-h-screen overflow-hidden bg-gray-100 text-gray-900">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200/80 bg-white/85 backdrop-blur-2xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">

          {/* LOGO */}

          <Link
            to="/"
            className="group flex items-center gap-3"
          >
            <motion.div
              whileHover={{
                scale: 1.08,
                rotate: 5,
              }}
              whileTap={{
                scale: 0.95,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-lg font-black text-gray-900 shadow-lg shadow-yellow-400/30"
            >
              C
            </motion.div>

            <span className="text-xl font-black tracking-tight text-gray-900">
              cur
              <span className="text-yellow-500">
                .book
              </span>
            </span>
          </Link>

          {/* DESKTOP NAVIGATION */}

          <nav className="hidden items-center gap-8 md:flex">

            {[
              "Features",
              "About",
              "Community",
            ].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="group relative text-sm font-semibold text-gray-500 transition duration-300 hover:text-gray-900"
              >
                {item}

                <span className="absolute -bottom-2 left-0 h-0.5 w-0 rounded-full bg-yellow-400 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}

          </nav>

          {/* NAV ACTIONS */}

          <div className="flex items-center gap-2">

            <Link
              to="/login"
              className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition duration-300 hover:bg-gray-100 hover:text-gray-900 sm:block"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="group flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-gray-900 shadow-lg shadow-yellow-400/20 transition duration-300 hover:-translate-y-0.5 hover:bg-yellow-500 hover:shadow-yellow-400/30"
            >
              <UserPlus size={17} />

              Register

              <ArrowRight
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>

          </div>

        </div>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="pt-20">

        {/* ===================================================
            HERO
        =================================================== */}

        <section className="relative overflow-hidden">

          {/* BACKGROUND GLOW */}

          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.35, 0.55, 0.35],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute left-1/2 top-[-250px] h-[650px] w-[900px] -translate-x-1/2 rounded-full bg-yellow-300/20 blur-[130px]"
          />

          <motion.div
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute right-[-150px] top-[300px] h-[400px] w-[400px] rounded-full bg-yellow-400/10 blur-[120px]"
          />

          {/* HERO CONTENT */}

          <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 py-24 lg:grid-cols-2 lg:px-8 lg:py-32">

            {/* LEFT */}

            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
            >

              {/* BADGE */}

              <motion.div variants={fadeUp}>

                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-semibold text-yellow-700 shadow-sm">

                  <Sparkles size={15} />

                  Welcome to cur.book

                  <motion.span
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [1, 0.5, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="h-2 w-2 rounded-full bg-yellow-500"
                  />

                </div>

              </motion.div>

              {/* HEADING */}

              <motion.h1
                variants={fadeUp}
                className="max-w-3xl text-5xl font-black leading-[1.02] tracking-tight text-gray-900 sm:text-6xl lg:text-7xl"
              >

                Connect.
                <br />

                Discover.
                <br />

                <span className="relative inline-block text-yellow-500">

                  Share.

                  <motion.span
                    initial={{
                      width: 0,
                    }}
                    animate={{
                      width: "100%",
                    }}
                    transition={{
                      delay: 1,
                      duration: 0.8,
                      ease: "easeOut",
                    }}
                    className="absolute bottom-[-6px] left-0 h-1.5 rounded-full bg-yellow-400/40"
                  />

                </span>

              </motion.h1>

              {/* DESCRIPTION */}

              <motion.p
                variants={fadeUp}
                className="mt-7 max-w-xl text-lg leading-8 text-gray-500"
              >
                A modern community platform where you can discover
                news, explore products, join groups, and connect with
                people — all in one place.
              </motion.p>

              {/* BUTTONS */}

              <motion.div
                variants={fadeUp}
                className="mt-9 flex flex-col gap-3 sm:flex-row"
              >

                <Link
                  to="/register"
                  className="group flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-6 py-4 font-bold text-gray-900 shadow-xl shadow-yellow-400/20 transition duration-300 hover:-translate-y-1 hover:bg-yellow-500 hover:shadow-yellow-400/30"
                >

                  Get Started

                  <ArrowRight
                    size={19}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />

                </Link>

                <Link
                  to="/login"
                  className="group flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-4 font-bold text-gray-700 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-yellow-400 hover:bg-yellow-50 hover:text-gray-900"
                >

                  <LogIn
                    size={19}
                    className="text-yellow-500 transition-transform duration-300 group-hover:translate-x-0.5"
                  />

                  Login

                </Link>

              </motion.div>

              {/* TRUST ITEMS */}

              <motion.div
                variants={fadeUp}
                className="mt-9 flex flex-wrap gap-6 text-sm text-gray-500"
              >

                <div className="flex items-center gap-2">

                  <ShieldCheck
                    size={17}
                    className="text-yellow-500"
                  />

                  Secure platform

                </div>

                <div className="flex items-center gap-2">

                  <Users
                    size={17}
                    className="text-yellow-500"
                  />

                  Community focused

                </div>

                <div className="flex items-center gap-2">

                  <Zap
                    size={17}
                    className="text-yellow-500"
                  />

                  Built for everyone

                </div>

              </motion.div>

            </motion.div>

            {/* =================================================
                HERO CARD
            ================================================= */}

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeLeft}
              className="relative"
            >

              {/* FLOATING DECORATION */}

              <motion.div
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, 5, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -right-4 -top-8 z-10 hidden h-20 w-20 rounded-2xl border border-yellow-300/40 bg-yellow-300/20 shadow-xl shadow-yellow-300/10 backdrop-blur-xl sm:block"
              />

              {/* CARD */}

              <motion.div
                whileHover={{
                  y: -7,
                  rotateX: 1,
                  rotateY: -1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 250,
                  damping: 20,
                }}
                className="relative rounded-[2rem] border border-gray-200 bg-white/80 p-3 shadow-2xl shadow-gray-300/50 backdrop-blur-xl"
              >

                <div className="rounded-[1.6rem] border border-gray-100 bg-gray-50 p-5 sm:p-6">

                  {/* CARD HEADER */}

                  <div className="mb-6 flex items-center justify-between">

                    <div>

                      <p className="text-sm font-medium text-gray-400">
                        Discover
                      </p>

                      <h3 className="mt-1 text-xl font-bold text-gray-900">
                        What's happening?
                      </h3>

                    </div>

                    <motion.div
                      whileHover={{
                        scale: 1.1,
                        rotate: 5,
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-yellow-300 bg-yellow-100 text-yellow-600"
                    >
                      <Search size={20} />
                    </motion.div>

                  </div>

                  {/* PREVIEW ITEMS */}

                  <div className="space-y-3">

                    <PreviewCard
                      icon={<Newspaper size={21} />}
                      title="Latest News"
                      description="Discover the latest stories and updates."
                    />

                    <PreviewCard
                      icon={<ShoppingBag size={21} />}
                      title="Marketplace"
                      description="Explore products from the community."
                    />

                    <PreviewCard
                      icon={<MessageCircle size={21} />}
                      title="Connect"
                      description="Chat and interact with your community."
                    />

                  </div>

                  {/* BOTTOM BAR */}

                  <div className="mt-5 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">

                    <div className="flex -space-x-2">

                      <motion.div
                        whileHover={{
                          y: -3,
                        }}
                        className="h-7 w-7 rounded-full border-2 border-white bg-gray-300"
                      />

                      <motion.div
                        whileHover={{
                          y: -3,
                        }}
                        className="h-7 w-7 rounded-full border-2 border-white bg-gray-400"
                      />

                      <motion.div
                        whileHover={{
                          y: -3,
                        }}
                        className="h-7 w-7 rounded-full border-2 border-white bg-yellow-400"
                      />

                    </div>

                    <span className="text-xs font-medium text-gray-400">
                      Your community awaits
                    </span>

                  </div>

                </div>

              </motion.div>

              {/* BOTTOM FLOATING ELEMENT */}

              <motion.div
                animate={{
                  y: [0, 12, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -bottom-6 -left-6 hidden h-16 w-16 rounded-full border border-gray-200 bg-white/80 shadow-xl backdrop-blur-xl sm:block"
              />

            </motion.div>

          </div>

        </section>

        {/* ===================================================
            FEATURES
        =================================================== */}

        <section
          id="features"
          className="relative border-t border-gray-200 bg-white"
        >

          <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">

            {/* SECTION HEADER */}

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{
                once: true,
                amount: 0.2,
              }}
              variants={stagger}
              className="mx-auto max-w-2xl text-center"
            >

              <motion.div variants={fadeUp}>

                <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300 bg-yellow-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">

                  <Sparkles size={13} />

                  Everything in one place

                </span>

              </motion.div>

              <motion.h2
                variants={fadeUp}
                className="mt-5 text-3xl font-black text-gray-900 sm:text-4xl"
              >

                Built for{" "}

                <span className="text-yellow-500">
                  connection
                </span>

              </motion.h2>

              <motion.p
                variants={fadeUp}
                className="mt-4 text-gray-500"
              >
                Everything you need to discover, communicate,
                participate, and grow together.
              </motion.p>

            </motion.div>

            {/* FEATURE CARDS */}

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{
                once: true,
                amount: 0.1,
              }}
              variants={stagger}
              className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            >

              <FeatureCard
                icon={<Newspaper size={24} />}
                title="News"
                description="Read, like, and comment on community news."
              />

              <FeatureCard
                icon={<ShoppingBag size={24} />}
                title="Marketplace"
                description="Discover products and communicate with sellers."
              />

              <FeatureCard
                icon={<Users size={24} />}
                title="Groups"
                description="Join communities and participate in discussions."
              />

              <FeatureCard
                icon={<MessageCircle size={24} />}
                title="Messaging"
                description="Connect privately with other users."
              />

            </motion.div>

          </div>

        </section>

        {/* ===================================================
            COMMUNITY CTA
        =================================================== */}

        <section
          id="community"
          className="border-t border-gray-200 bg-gray-100"
        >

          <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">

            <motion.div
              initial={{
                opacity: 0,
                y: 35,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                amount: 0.3,
              }}
              transition={{
                duration: 0.7,
              }}
              className="relative overflow-hidden rounded-[2rem] border border-yellow-300/50 bg-white p-8 shadow-xl shadow-gray-200 sm:p-12 lg:flex lg:items-center lg:justify-between"
            >

              {/* YELLOW GLOW */}

              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.2, 0.35, 0.2],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute right-[-100px] top-[-100px] h-72 w-72 rounded-full bg-yellow-300/30 blur-3xl"
              />

              <div className="relative max-w-2xl">

                <div className="mb-4 flex items-center gap-2 text-yellow-600">

                  <CheckCircle2 size={19} />

                  <span className="text-sm font-semibold">
                    Join cur.book
                  </span>

                </div>

                <h2 className="text-3xl font-black text-gray-900 sm:text-4xl">
                  Ready to join the community?
                </h2>

                <p className="mt-4 leading-7 text-gray-500">
                  Create your account and start discovering what
                  cur.book has to offer.
                </p>

              </div>

              <Link
                to="/register"
                className="group relative mt-8 inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-6 py-4 font-bold text-gray-900 shadow-lg shadow-yellow-400/20 transition duration-300 hover:-translate-y-1 hover:bg-yellow-500 hover:shadow-yellow-400/30 lg:mt-0"
              >

                Create Account

                <ArrowRight
                  size={19}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />

              </Link>

            </motion.div>

          </div>

        </section>

        {/* ===================================================
            ABOUT
        =================================================== */}

        <section
          id="about"
          className="border-t border-gray-200 bg-white"
        >

          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.7,
            }}
            className="mx-auto max-w-3xl px-5 py-24 text-center lg:px-8"
          >

            <span className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-600">
              About cur.book
            </span>

            <h2 className="mt-4 text-3xl font-black text-gray-900 sm:text-4xl">

              One platform.

              <br />

              <span className="text-yellow-500">
                Many possibilities.
              </span>

            </h2>

            <p className="mt-6 leading-8 text-gray-500">
              cur.book brings news, products, groups, conversations,
              notifications, and community interactions together in
              one modern platform.
            </p>

          </motion.div>

        </section>

      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="border-t border-gray-200 bg-gray-100">

        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between lg:px-8">

          {/* FOOTER BRAND */}

          <div className="flex items-center gap-3">

            <motion.div
              whileHover={{
                rotate: 5,
                scale: 1.05,
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-400 text-xs font-black text-gray-900"
            >
              C
            </motion.div>

            <span className="text-gray-500">
              © {new Date().getFullYear()}{" "}
              <span className="font-semibold text-gray-700">
                cur.book
              </span>
            </span>

          </div>

          {/* FOOTER LINKS */}

          <div className="flex gap-5">

            <Link
              to="/login"
              className="font-medium text-gray-500 transition hover:text-yellow-600"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="font-medium text-gray-500 transition hover:text-yellow-600"
            >
              Register
            </Link>

          </div>

        </div>

      </footer>

    </div>
  );
}

/* =========================================================
   PREVIEW CARD
========================================================= */

function PreviewCard({
  icon,
  title,
  description,
}) {
  return (
    <motion.div
      whileHover={{
        x: 6,
        scale: 1.01,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
      className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition duration-300 hover:border-yellow-300 hover:shadow-md"
    >

      <div className="flex gap-3">

        <motion.div
          whileHover={{
            scale: 1.08,
            rotate: 4,
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-600 transition duration-300 group-hover:bg-yellow-400 group-hover:text-gray-900"
        >
          {icon}
        </motion.div>

        <div className="min-w-0">

          <p className="font-semibold text-gray-900">
            {title}
          </p>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            {description}
          </p>

        </div>

      </div>

    </motion.div>
  );
}

/* =========================================================
   FEATURE CARD
========================================================= */

function FeatureCard({
  icon,
  title,
  description,
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{
        y: -8,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition duration-300 hover:border-yellow-300 hover:shadow-xl hover:shadow-gray-200"
    >

      {/* HOVER GLOW */}

      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-yellow-300/20 opacity-0 blur-3xl transition duration-500 group-hover:opacity-100" />

      <div className="relative">

        {/* ICON */}

        <motion.div
          whileHover={{
            scale: 1.08,
            rotate: 4,
          }}
          transition={{
            type: "spring",
            stiffness: 350,
          }}
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-600 transition duration-300 group-hover:bg-yellow-400 group-hover:text-gray-900"
        >
          {icon}
        </motion.div>

        {/* TITLE */}

        <h3 className="mt-5 text-lg font-bold text-gray-900">
          {title}
        </h3>

        {/* DESCRIPTION */}

        <p className="mt-2 text-sm leading-6 text-gray-500">
          {description}
        </p>

        {/* EXPLORE */}

        <div className="mt-5 flex items-center gap-1 text-xs font-bold text-yellow-600 opacity-0 transition duration-300 group-hover:opacity-100">

          Explore

          <ArrowRight
            size={13}
            className="transition-transform group-hover:translate-x-1"
          />

        </div>

      </div>

    </motion.div>
  );
}