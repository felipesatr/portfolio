import {
  IconDeviceDesktop,
  IconArrowDown,
  IconArrowLeft,
  IconCircleArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconArrowUpRight,
  IconCode,
  IconCopy,
  IconDownload,
  IconMaximize,
  IconFilter,
  IconFaceId,
  IconHeart,
  IconInfoCircle,
  IconLanguage,
  IconBulb,
  IconChevronLeft,
  IconPlayerPlay,
  IconRefresh,
  IconSend,
  IconSparkles,
  IconSun,
  IconTrash,
  IconLayoutGrid,
} from "@tabler/icons-react";
import { RoundedTablerWand } from "./rounded-tabler-wand";

interface IconProps {
  size?: number;
  className?: string;
}

const sharedProps = {
  "aria-hidden": true,
  focusable: false,
  strokeWidth: 1.5,
} as const;

export function ArrowUpRightIcon({ size = 18, className }: IconProps) {
  return <IconArrowUpRight {...sharedProps} strokeWidth={2.5} className={className} width={size} height={size} />;
}

export function ArrowDownIcon({ size = 18, className }: IconProps) {
  return <IconArrowDown {...sharedProps} className={className} width={size} height={size} />;
}

export function ArrowUpIcon({ size = 18, className }: IconProps) {
  return <IconArrowUp {...sharedProps} className={className} width={size} height={size} />;
}

export function ArrowLeftIcon({ size = 18, className }: IconProps) {
  return <IconArrowLeft {...sharedProps} className={className} width={size} height={size} />;
}

export function ArrowRightIcon({ size = 18, className }: IconProps) {
  return <IconArrowRight {...sharedProps} strokeWidth={2.5} className={className} width={size} height={size} />;
}

export function CopyIcon({ size = 18, className }: IconProps) {
  return <IconCopy {...sharedProps} strokeWidth={2.5} className={className} width={size} height={size} />;
}

export function ArrowLeftCircleIcon({ size = 18, className }: IconProps) {
  return <IconCircleArrowLeft {...sharedProps} className={className} width={size} height={size} />;
}

export function NavArrowLeftIcon({ size = 18, className }: IconProps) {
  return <IconChevronLeft {...sharedProps} className={className} width={size} height={size} />;
}

export function ExpandIcon({ size = 18, className }: IconProps) {
  return <IconMaximize {...sharedProps} className={className} width={size} height={size} />;
}

export function GridIcon({ size = 18, className }: IconProps) {
  return <IconLayoutGrid {...sharedProps} className={className} width={size} height={size} />;
}

export function FilterIcon({ size = 18, className }: IconProps) {
  return <IconFilter {...sharedProps} className={className} width={size} height={size} />;
}

export function FaceIdIcon({ size = 18, className }: IconProps) {
  return <IconFaceId {...sharedProps} className={className} width={size} height={size} />;
}

export function SendDiagonalSolidIcon({ size = 18, className }: IconProps) {
  return <IconSend {...sharedProps} className={className} width={size} height={size} />;
}

export function LanguageIcon({ size = 18, className }: IconProps) {
  return <IconLanguage {...sharedProps} className={className} width={size} height={size} />;
}

export function SunIcon({ size = 18, className }: IconProps) {
  return <IconSun {...sharedProps} className={className} width={size} height={size} />;
}

export function TrashIcon({ size = 18, className }: IconProps) {
  return <IconTrash {...sharedProps} className={className} width={size} height={size} />;
}

export function InfoCircleIcon({ size = 18, className }: IconProps) {
  return <IconInfoCircle {...sharedProps} className={className} width={size} height={size} />;
}

export function HeartIcon({ size = 18, className }: IconProps) {
  return <IconHeart {...sharedProps} className={className} width={size} height={size} />;
}
export function PlayIcon({ size = 18, className }: IconProps) {
  return <IconPlayerPlay {...sharedProps} className={className} width={size} height={size} />;
}

export function DownloadIcon({ size = 18, className }: IconProps) {
  return <IconDownload {...sharedProps} className={className} width={size} height={size} />;
}

export function RestartIcon({ size = 18, className }: IconProps) {
  return <IconRefresh {...sharedProps} className={className} width={size} height={size} />;
}

export function InterfaceIcon({ size = 28, className }: IconProps) {
  return <IconDeviceDesktop {...sharedProps} strokeWidth={1.8} className={className} width={size} height={size} />;
}

export function CodeIcon({ size = 28, className }: IconProps) {
  return <IconCode {...sharedProps} strokeWidth={1.8} className={className} width={size} height={size} />;
}

export function StrategyIcon({ size = 28, className }: IconProps) {
  return <IconBulb {...sharedProps} strokeWidth={1.8} className={className} width={size} height={size} />;
}

export function SparkIcon({ size = 28, className }: IconProps) {
  return <IconSparkles {...sharedProps} className={className} width={size} height={size} />;
}

export function AutomationIcon({ size = 28, className }: IconProps) {
  return <RoundedTablerWand {...sharedProps} strokeWidth={1.8} className={className} width={size} height={size} />;
}
