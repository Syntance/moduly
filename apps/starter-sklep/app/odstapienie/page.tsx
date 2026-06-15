import { redirect } from "next/navigation";

/** Alias — kanoniczna trasa odstąpienia: /konto/odstapienie */
export default function OdstapienieRedirect() {
	redirect("/konto/odstapienie");
}
