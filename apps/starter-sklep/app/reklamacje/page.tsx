import { redirect } from "next/navigation";

/** Alias — kanoniczna trasa reklamacji: /konto/reklamacje */
export default function ReklamacjeRedirect() {
	redirect("/konto/reklamacje");
}
