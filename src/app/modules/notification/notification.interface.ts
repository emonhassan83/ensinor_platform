import { NotificationModeType } from "@prisma/client";

export type INotification = {
    receiverId?: string;
    referenceId?: string;
    modeType: NotificationModeType;
    message: string;
    description?: string;
}