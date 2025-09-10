// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface UploadedFiles {
  image?: Express.Multer.File[]
  banner?: Express.Multer.File[]
  profile?: Express.Multer.File[]
  images?: Express.Multer.File[]
  thumbnail?: Express.Multer.File[]
  file?: Express.Multer.File[]
  videos?: Express.Multer.File[]
  documents?: Express.Multer.File[]
  logo?: Express.Multer.File[]
  signature?: Express.Multer.File[]
}
