import { useOverflowing } from "@/hooks/use-overflowing";

// Stack trace e texto puro: sem descendente focavel o bloco com max-h + overflow
// fica inacessivel por teclado (axe scrollable-region-focusable). O tabIndex so
// entra quando ha rolagem, para nao criar parada de Tab em trace curto.
export function StackTrace({ text }: { text: string }) {
  const { ref, overflowing } = useOverflowing<HTMLPreElement>();
  return (
    <pre
      ref={ref}
      role="region"
      aria-label="Stack trace do erro"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- regiao rolavel sem foco interno precisa ser focavel (axe scrollable-region-focusable)
      tabIndex={overflowing ? 0 : undefined}
      className="text-[10px] font-mono whitespace-pre-wrap break-all text-muted-foreground max-h-32 overflow-auto"
    >
      {text}
    </pre>
  );
}