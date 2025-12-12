import { redirect } from "next/navigation"

export default function CouncilPage() {
  redirect("/?mode=council")
}
