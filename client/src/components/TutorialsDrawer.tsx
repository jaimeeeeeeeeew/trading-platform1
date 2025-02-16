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

// Lista de reproducción de YouTube con tutoriales
const PLAYLIST_ID = "PLKEs2g-Oles3ys5-Gf4_mjuGxOnECV7fR";

export function TutorialsDrawer() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-6 px-2 text-xs text-primary-foreground hover:bg-primary/10"
        >
          <VideoIcon className="h-3 w-3 mr-1" />
          Ver tutoriales
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[80vh]">
        <div className="mx-auto w-full max-w-4xl">
          <DrawerHeader>
            <DrawerTitle>Tutoriales</DrawerTitle>
            <DrawerDescription>
              Videos explicativos sobre el uso de la plataforma
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            <p className="text-sm text-muted-foreground mb-4">
              Aquí encontrarás una serie de tutoriales sobre trading y el uso de la plataforma
            </p>
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/videoseries?list=${PLAYLIST_ID}`}
                title="Tutoriales de Trading"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
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