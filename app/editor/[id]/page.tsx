import MenuEditorLoader from "../menu-editor-loader";

/**
 * The session lives in the browser (Bearer JWT in localStorage), so server
 * pages cannot read the token here. The client loader fetches the cafe with
 * an authed GET — ownership enforced server-side (RLS).
 */
export const dynamic = "force-dynamic";
export default function EditorPage() {
  return <MenuEditorLoader />;
}