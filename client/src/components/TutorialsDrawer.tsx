import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { VideoIcon } from "lucide-react"

interface Video {
  id: string
  title: string
}

const tutorials: Video[] = [
  { id: "video1", title: "Tutorial básico de trading" },
  { id: "video2", title: "Análisis técnico avanzado" },
  { id: "video3", title: "Uso de indicadores" },
]

export function TutorialsDrawer() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button 
          variant="ghost" 
          size="xs" 
          className="h-6 px-2 text-xs text-primary-foreground hover:bg-primary/10"
        >
          <VideoIcon className="h-3 w-3 mr-1" />
          Ver tutoriales
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-4xl">
          <DrawerHeader>
            <DrawerTitle>Tutoriales</DrawerTitle>
            <DrawerDescription>
              Videos explicativos sobre el uso de la plataforma
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 grid gap-4">
            {tutorials.map((video) => (
              <div key={video.id} className="aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${video.id}`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ))}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}