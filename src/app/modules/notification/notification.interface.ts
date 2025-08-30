import { NotificationModeType } from "@prisma/client";

export type INotification = {
    receiver: string;
    reference?: string;
    modeType: NotificationModeType;
    message: string;
    description?: string;
}