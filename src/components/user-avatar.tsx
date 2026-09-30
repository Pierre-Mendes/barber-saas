import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn, initials } from "@/lib/utils"

export function UserAvatar({
  name,
  image,
  className,
}: {
  name: string | null | undefined
  image?: string | null
  className?: string
}) {
  return (
    <Avatar className={className}>
      {image && <AvatarImage src={image} alt={name ?? ""} />}
      <AvatarFallback className={cn("bg-primary/20 text-primary")}>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
