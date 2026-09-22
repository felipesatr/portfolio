import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  CodeBrackets,
  Download,
  FilterAlt,
  FaceId,
  Heart,
  InfoCircle,
  Language,
  LightBulb,
  Play,
  Refresh,
  SendDiagonalSolid,
  Sparks,
  SunLight,
  Trash,
  ViewGrid,
  WindowTabs,
} from "iconoir-react";

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
  return <ArrowUpRight {...sharedProps} className={className} width={size} height={size} />;
}

export function ArrowDownIcon({ size = 18, className }: IconProps) {
  return <ArrowDown {...sharedProps} className={className} width={size} height={size} />;
}

export function ArrowUpIcon({ size = 18, className }: IconProps) {
  return <ArrowUp {...sharedProps} className={className} width={size} height={size} />;
}

export function ArrowLeftIcon({ size = 18, className }: IconProps) {
  return <ArrowLeft {...sharedProps} className={className} width={size} height={size} />;
}

export function ArrowRightIcon({ size = 18, className }: IconProps) {
  return <ArrowRight {...sharedProps} className={className} width={size} height={size} />;
}

export function GridIcon({ size = 18, className }: IconProps) {
  return <ViewGrid {...sharedProps} className={className} width={size} height={size} />;
}

export function FilterIcon({ size = 18, className }: IconProps) {
  return <FilterAlt {...sharedProps} className={className} width={size} height={size} />;
}

export function FaceIdIcon({ size = 18, className }: IconProps) {
  return <FaceId {...sharedProps} className={className} width={size} height={size} />;
}

export function SendDiagonalSolidIcon({ size = 18, className }: IconProps) {
  return <SendDiagonalSolid {...sharedProps} className={className} width={size} height={size} />;
}

export function LanguageIcon({ size = 18, className }: IconProps) {
  return <Language {...sharedProps} className={className} width={size} height={size} />;
}

export function SunIcon({ size = 18, className }: IconProps) {
  return <SunLight {...sharedProps} className={className} width={size} height={size} />;
}

export function TrashIcon({ size = 18, className }: IconProps) {
  return <Trash {...sharedProps} className={className} width={size} height={size} />;
}

export function InfoCircleIcon({ size = 18, className }: IconProps) {
  return <InfoCircle {...sharedProps} className={className} width={size} height={size} />;
}

export function HeartIcon({ size = 18, className }: IconProps) {
  return <Heart {...sharedProps} className={className} width={size} height={size} />;
}
export function PlayIcon({ size = 18, className }: IconProps) {
  return <Play {...sharedProps} className={className} width={size} height={size} />;
}

export function DownloadIcon({ size = 18, className }: IconProps) {
  return <Download {...sharedProps} className={className} width={size} height={size} />;
}

export function RestartIcon({ size = 18, className }: IconProps) {
  return <Refresh {...sharedProps} className={className} width={size} height={size} />;
}

export function InterfaceIcon({ size = 28, className }: IconProps) {
  return <WindowTabs {...sharedProps} className={className} width={size} height={size} />;
}

export function CodeIcon({ size = 28, className }: IconProps) {
  return <CodeBrackets {...sharedProps} className={className} width={size} height={size} />;
}

export function StrategyIcon({ size = 28, className }: IconProps) {
  return <LightBulb {...sharedProps} className={className} width={size} height={size} />;
}

export function SparkIcon({ size = 28, className }: IconProps) {
  return <Sparks {...sharedProps} className={className} width={size} height={size} />;
}
