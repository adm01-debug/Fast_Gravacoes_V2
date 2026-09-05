import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  { ignores: ["dist", "coverage", "scripts"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Critical: keep as errors
      "react-hooks/rules-of-hooks": "error",
      "no-debugger": "error",
      // eslint-plugin-react-hooks v7 ships the React Compiler heuristic rules
      // enabled as errors in its `recommended` config. This project does not use
      // the React Compiler, and these rules are advisory/heuristic (prone to
      // false positives). Surface them as warnings — consistent with the policy
      // below of downgrading noisy pre-existing patterns — so genuine issues stay
      // visible without blocking CI. `rules-of-hooks` above remains an error.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/incompatible-library": "warn",
      // Downgrade noisy pre-existing violations to warnings
      "no-console": "warn",
      "no-case-declarations": "warn",
      "no-empty": "warn",
      "no-useless-catch": "warn",
      "no-useless-escape": "warn",
      "prefer-const": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      // 🏆 Milestone 10/10: baseline `any` = 0 no src/. Travar regressões.
      "@typescript-eslint/no-explicit-any": "error",
      // Reduzir uso de non-null assertion (`!`) — força narrowing explícito
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // jsx-a11y: keep as warnings (large pre-existing codebase)
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/anchor-has-content": "warn",
      "jsx-a11y/heading-has-content": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
      "jsx-a11y/no-noninteractive-tabindex": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/aria-props": "warn",
    },
  },
  {
    files: ["src/lib/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["src/test/**", "tests/**", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // Supabase edge functions run on Deno: `console` is the standard logging
    // mechanism, payloads are loosely typed, and `Deno.env.get(...)!` is the
    // idiomatic pattern for required secrets validated at boot.
    files: ["supabase/functions/**/*.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // shadcn/ui primitives and React Context providers intentionally co-export
    // components alongside hooks/variants/context objects. This is the
    // library-recommended pattern and doesn't harm Fast Refresh in practice.
    files: [
      "src/components/ui/**/*.{ts,tsx}",
      "src/contexts/**/*.{ts,tsx}",
      "src/components/accessibility/AccessibilityProvider.tsx",
      "src/components/feedback/FeedbackProvider.tsx",
      "src/components/onboarding/**/*.tsx",
      "src/components/shortcuts/**/*.tsx",
      "src/components/voice/**/*.tsx",
      "src/components/alerts/AlertCard.tsx",
      "src/components/alerts/AlertJobCard.tsx",
      "src/components/activity/ActivityLog.tsx",
      "src/components/auth/PasswordStrengthIndicator.tsx",
      "src/components/feedback/CelebrationMoment.tsx",
      "src/components/mobile/SwipeActions.tsx",
      "src/components/navigation/FavoritesManager.tsx",
      "src/features/auth/hooks/**/*.{ts,tsx}",
      "src/features/admin/components/audit/HistoryPeriodFilter.tsx",
      "src/features/notifications/components/ToastWithUndo.tsx",
      "src/hooks/useNetworkStatus.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);

