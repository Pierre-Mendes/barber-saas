"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { updateSession } from "@/auth"
import { requireUser } from "@/lib/auth/guards"
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "@/lib/auth/password"
import { db } from "@/lib/db"
import { fileFromForm, removeUserAvatar, StorageError, storeUserAvatar } from "@/lib/storage"

const PATH = "/conta"

function back(kind: "erro" | "ok", message: string): never {
  redirect(`${PATH}?${kind}=${encodeURIComponent(message)}`)
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
  phone: z.string().trim().max(30),
  /** URL atual da foto (vazio = remover). Só aceita a que já está salva. */
  image: z.string().max(500),
})

/** Nome, celular e foto (upload no MinIO/S3). */
export async function updateProfileAction(formData: FormData) {
  const sessionUser = await requireUser(PATH)
  const parsed = profileSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    image: formData.get("image") ?? "",
  })
  if (!parsed.success) {
    back("erro", parsed.error.issues[0]?.message ?? "Dados inválidos.")
  }
  const user = await db.user.findUniqueOrThrow({ where: { id: sessionUser.id } })
  // A pessoa só pode manter a foto atual ou removê-la; foto nova vem como arquivo.
  let image = parsed.data.image && parsed.data.image === user.image ? user.image : null
  const file = fileFromForm(formData, "imageFile")
  if (file) {
    try {
      image = await storeUserAvatar(user.id, file)
    } catch (error) {
      if (error instanceof StorageError) {
        back("erro", error.message)
      }
      throw error
    }
  }
  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone || null, image },
  })
  if (user.image !== image) {
    await removeUserAvatar(user.id, user.image)
  }
  await updateSession({ user: { name: parsed.data.name, image } })
  revalidatePath("/", "layout")
  back("ok", "Perfil atualizado.")
}

/** Define a senha (quem entrou por link/Google) ou troca (exige a atual). */
export async function updatePasswordAction(formData: FormData) {
  const sessionUser = await requireUser(PATH)
  const current = String(formData.get("currentPassword") ?? "")
  const next = String(formData.get("newPassword") ?? "")
  if (next.length < MIN_PASSWORD_LENGTH || next.length > 200) {
    back("erro", `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
  }
  const user = await db.user.findUniqueOrThrow({ where: { id: sessionUser.id } })
  if (user.passwordHash && !(await verifyPassword(current, user.passwordHash))) {
    back("erro", "Senha atual incorreta.")
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } })
  back("ok", user.passwordHash ? "Senha alterada." : "Senha definida. Agora você pode entrar com e-mail e senha.")
}
