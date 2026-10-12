import type { AnchorHTMLAttributes, ReactNode, Ref } from "react";

/**
 * Navigation link that renders a plain <a>.
 *
 * `next/link` is unusable on this stack: vinext 1.0.0-beta.5's Link click
 * handler calls `navigateClientSide` from a navigation module that does not
 * export it, so every Link navigation throws
 *
 *   TypeError: e is not a function        (inside React.startTransition)
 *   [vinext] RSC prefetch setup error: TypeError: ee is not a function
 *
 * and the URL never changes. A plain anchor performs a normal document
 * navigation, which always works. The cost is a full page load instead of
 * client-side routing; for these navigation links (back to the panel, module
 * cross-links, brand) that is acceptable and actually gives a fresh
 * server-rendered access check.
 *
 * Revisit when vinext ships a release whose Link navigates correctly: swap
 * this component back to next/link and drop the wrapper.
 */
export default function NavLink({
  href,
  children,
  ref,
  ...rest
}: {
  href: string;
  children: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children">) {
  return (
    <a href={href} ref={ref} {...rest}>
      {children}
    </a>
  );
}
