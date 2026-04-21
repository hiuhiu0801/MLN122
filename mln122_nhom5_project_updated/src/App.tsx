import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Camera,
  ChevronDown,
  ChevronRight,
  Grid2X2,
  History,
  Layers,
  LogIn,
  LogOut,
  MessageSquare,
  Moon,
  Send,
  Settings,
  Sparkles,
  Sun,
  Target,
  User,
  X,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getChatResponse, generateImage } from "./lib/gemini";
import { auth, googleProvider } from "./lib/firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import FlipBook from "./FlipBook";

interface Message {
  role: "user" | "model";
  text: string;
  timestamp?: any;
}

interface UserProfile {
  displayName: string;
  photoURL?: string;
}

interface StudyTopic {
  id: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  summary: string;
  highlights: string[];
  content: string;
  example: string;
  imagePrompt: string;
  imageUrl?: string;
}

interface SupplementItem {
  id: string;
  title: string;
  teaser: string;
  icon: React.ReactNode;
  detail: string;
  bullets: string[];
}

const FEATURE_IMAGES = {
  hero: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1400&q=80",
  overview: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80",
};

const STRUCTURE_ITEMS = [
  {
    id: "khai-niem",
    title: "Khái niệm",
    desc: "Làm rõ nội hàm của mô hình kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam.",
  },
  {
    id: "tinh-tat-yeu",
    title: "Tính tất yếu khách quan",
    desc: "Giải thích vì sao phát triển mô hình này là lựa chọn phù hợp với quy luật phát triển và nguyện vọng của nhân dân.",
  },
  {
    id: "dac-trung",
    title: "Đặc trưng",
    desc: "Trình bày các đặc trưng về mục tiêu, sở hữu, quản lý, phân phối và gắn tăng trưởng kinh tế với tiến bộ, công bằng xã hội.",
  },
];

const PhilosophicalParticles = ({ density = 25, className = "" }: { density?: number; className?: string }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: density }).map(() => ({
        xInit: `${Math.random() * 100}%`,
        yInit: `${Math.random() * 100}%`,
        scaleInit: Math.random() * 0.5 + 0.5,
        xAnim: `${Math.random() * 10 - 5}%`,
        opacityMax: Math.random() * 0.4 + 0.2,
        duration: Math.random() * 5 + 5,
        delay: Math.random() * 3,
      })),
    [density]
  );

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 bg-primary/30 dark:bg-primary/50 rounded-full blur-[1px]"
          initial={{ x: p.xInit, y: p.yInit, opacity: 0, scale: p.scaleInit }}
          animate={{
            y: ["0%", "15%", "-15%", "0%"],
            x: ["0%", p.xAnim, "0%"],
            opacity: [0, p.opacityMax, 0],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Xin chào! Tôi là trợ lý AI của Chương 5. Tôi có thể hỗ trợ bạn về khái niệm, tính tất yếu khách quan và đặc trưng của kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<Record<string, boolean>>({});
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as "light" | "dark") || "light";
    }
    return "light";
  });
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPhotoURL, setNewPhotoURL] = useState("");

  // State quản lý việc mở rộng/thu gọn nội dung của phần Supplement
  const [expandedSupplement, setExpandedSupplement] = useState<string | null>("supp-1");

  // State quản lý việc mở rộng/thu gọn nội dung dài của Tab (Nội dung trọng tâm)
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const toggleExpandTopic = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getLocalProfileKey = (uid: string) => `ktttxh_profile_${uid}`;
  const getLocalMessagesKey = (uid: string) => `ktttxh_messages_${uid}`;

  const loadLocalProfile = (currentUser: FirebaseUser): UserProfile => {
    try {
      const raw = localStorage.getItem(getLocalProfileKey(currentUser.uid));
      const saved = raw ? JSON.parse(raw) : {};
      return {
        displayName: saved.displayName || currentUser.displayName || "Người dùng",
        photoURL: saved.photoURL || currentUser.photoURL || "",
      };
    } catch {
      return {
        displayName: currentUser.displayName || "Người dùng",
        photoURL: currentUser.photoURL || "",
      };
    }
  };

  const saveLocalProfile = (uid: string, nextProfile: UserProfile) => {
    localStorage.setItem(getLocalProfileKey(uid), JSON.stringify(nextProfile));
  };

  const getDefaultWelcomeMessage = (): Message[] => [
    {
      role: "model",
      text: "Xin chào! Tôi là trợ lý AI của Chương 5. Hãy hỏi tôi về khái niệm, tính tất yếu khách quan và đặc trưng của kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam.",
    },
  ];

  const loadLocalMessages = (uid: string): Message[] => {
    try {
      const raw = localStorage.getItem(getLocalMessagesKey(uid));
      const saved = raw ? JSON.parse(raw) : [];
      return Array.isArray(saved) && saved.length > 0 ? saved : getDefaultWelcomeMessage();
    } catch {
      return getDefaultWelcomeMessage();
    }
  };

  const saveLocalMessages = (uid: string, nextMessages: Message[]) => {
    localStorage.setItem(getLocalMessagesKey(uid), JSON.stringify(nextMessages));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isChatOpen]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setMessages(getDefaultWelcomeMessage());
        return;
      }

      const localProfile = loadLocalProfile(currentUser);
      setProfile(localProfile);
      saveLocalProfile(currentUser.uid, localProfile);
      setMessages(loadLocalMessages(currentUser.uid));
    });
    return () => unsubscribe();
  }, []);

  const resetAuthForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRegisterName("");
    setAuthError("");
  };

  const getReadableAuthError = (error: any, mode: "login" | "register") => {
    const code = error?.code;
    switch (code) {
      case "auth/email-already-in-use":
        return "Email này đã được sử dụng.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Email hoặc mật khẩu không chính xác.";
      default:
        return mode === "register" ? "Đăng ký thất bại. Vui lòng thử lại." : "Đăng nhập thất bại. Vui lòng thử lại.";
    }
  };

  const handleLogin = () => {
    resetAuthForm();
    setIsAuthDialogOpen(true);
    setAuthMode("login");
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    setIsAuthSubmitting(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthDialogOpen(false);
      resetAuthForm();
      toast.success("Đăng nhập thành công!");
    } catch (error: any) {
      setAuthError(getReadableAuthError(error, "login"));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setAuthError("");

    if (!normalizedEmail) {
      setAuthError("Vui lòng nhập email.");
      return;
    }

    if (authMode === "register") {
      if (password !== confirmPassword) {
        setAuthError("Mật khẩu xác nhận không khớp.");
        return;
      }
      if (password.length < 6) {
        setAuthError("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
      }
    }

    setIsAuthSubmitting(true);

    try {
      if (authMode === "register") {
        const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        await updateProfile(userCredential.user, { displayName: registerName.trim() });

        const nextProfile = {
          displayName: registerName.trim(),
          photoURL: userCredential.user.photoURL || "",
        };

        saveLocalProfile(userCredential.user.uid, nextProfile);
        setProfile(nextProfile);
        setIsAuthDialogOpen(false);
        resetAuthForm();
        toast.success("Đăng ký thành công!");
        return;
      }

      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      setIsAuthDialogOpen(false);
      resetAuthForm();
      toast.success("Đăng nhập thành công!");
    } catch (error: any) {
      setAuthError(getReadableAuthError(error, authMode));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setAuthError("Hãy nhập email trước khi yêu cầu đặt lại mật khẩu.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      toast.success("Đã gửi email đặt lại mật khẩu.");
    } catch (error: any) {
      setAuthError(getReadableAuthError(error, "login"));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsChatOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user || !newDisplayName.trim()) return;
    setIsUpdatingProfile(true);
    try {
      let photoURL = newPhotoURL.trim() || profile?.photoURL || "";
      const updatedProfile = { displayName: newDisplayName.trim(), photoURL };
      await updateProfile(user, updatedProfile);
      saveLocalProfile(user.uid, updatedProfile);
      setProfile(updatedProfile);
      setIsProfileDialogOpen(false);
      toast.success("Cập nhật hồ sơ thành công!");
    } catch (error) {
      toast.error("Cập nhật hồ sơ thất bại.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const [topics, setTopics] = useState<StudyTopic[]>([
    {
      id: "topic-1",
      shortTitle: "Khái niệm",
      title: "Khái niệm kinh tế thị trường định hướng XHCN",
      subtitle: "Nền kinh tế vận hành theo quy luật thị trường nhưng hướng tới mục tiêu xã hội chủ nghĩa.",
      icon: <BookOpen className="w-6 h-6 text-accent" />,
      summary:
        "Đây là mô hình kinh tế vừa tuân theo các quy luật của thị trường, vừa hướng tới mục tiêu dân giàu, nước mạnh, dân chủ, công bằng, văn minh dưới sự điều tiết của Nhà nước do Đảng Cộng sản Việt Nam lãnh đạo.",
      highlights: [
        "Vận hành theo các quy luật của thị trường.",
        "Hướng tới từng bước xác lập các giá trị xã hội chủ nghĩa.",
        "Có sự điều tiết của Nhà nước pháp quyền xã hội chủ nghĩa.",
      ],
      content: `
**Khái niệm cốt lõi**

Kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam là **nền kinh tế vận hành theo các quy luật của thị trường**, đồng thời **góp phần hướng tới từng bước xác lập một xã hội** mà ở đó dân giàu, nước mạnh, dân chủ, công bằng, văn minh; **có sự điều tiết của Nhà nước** do Đảng Cộng sản Việt Nam lãnh đạo.

**Những điểm cần nắm**

- Đây là mô hình **không phủ nhận kinh tế thị trường**, mà sử dụng kinh tế thị trường như một công cụ để phát triển đất nước.
- Mô hình này vừa mang **đặc trưng của kinh tế thị trường nói chung**, vừa thể hiện **định hướng xã hội chủ nghĩa phù hợp với điều kiện Việt Nam**.
- Bản chất của định hướng là phát triển kinh tế gắn với mục tiêu tiến bộ, công bằng xã hội và nâng cao đời sống nhân dân.
      `,
      example:
        "Trong thực tiễn, nền kinh tế vẫn có nhiều chủ thể cạnh tranh, nhiều hình thức sở hữu, nhưng Nhà nước định hướng phát triển bằng pháp luật, chiến lược, chính sách và an sinh xã hội.",
      imagePrompt:
        "Educational illustration about Vietnam socialist-oriented market economy, balance between market dynamics, state regulation, social welfare, academic infographic style, bright warm colors.",
    },
    {
      id: "topic-2",
      shortTitle: "Tính tất yếu",
      title: "Tính tất yếu khách quan của việc phát triển mô hình",
      subtitle: "Sự lựa chọn phù hợp với quy luật phát triển khách quan và nguyện vọng của nhân dân.",
      icon: <Target className="w-6 h-6 text-accent" />,
      summary:
        "Việc phát triển mô hình này là tất yếu vì phù hợp với quy luật phát triển khách quan, phát huy ưu thế của kinh tế thị trường trong thúc đẩy phát triển, đồng thời đáp ứng mục tiêu dân giàu, nước mạnh, dân chủ, công bằng, văn minh.",
      highlights: [
        "Phù hợp với quy luật phát triển khách quan.",
        "Phát huy tính ưu việt của kinh tế thị trường.",
        "Phù hợp với nguyện vọng của nhân dân Việt Nam.",
      ],
      content: `
**Vì sao là tất yếu khách quan?**

- **Thứ nhất, phù hợp với quy luật phát triển khách quan.** Trong điều kiện hội nhập và phát triển hiện nay, kinh tế thị trường là hình thức tổ chức kinh tế có khả năng huy động nguồn lực và thúc đẩy phân công lao động xã hội.
- **Thứ hai, mô hình này phát huy ưu thế của kinh tế thị trường.** Kinh tế thị trường tạo động lực cạnh tranh, khuyến khích đổi mới sáng tạo, nâng cao năng suất lao động và hiệu quả phân bổ nguồn lực.
- **Thứ ba, mô hình này phù hợp với nguyện vọng của nhân dân Việt Nam.** Việt Nam hướng tới mục tiêu dân giàu, nước mạnh, dân chủ, công bằng, văn minh; vì vậy cần một mô hình vừa thúc đẩy tăng trưởng vừa bảo đảm định hướng xã hội.

**Ý nghĩa rút ra**

Việc lựa chọn mô hình này là **kết quả của quá trình nhận thức và vận dụng quy luật phát triển vào điều kiện cụ thể của Việt Nam**, chứ không phải sự lựa chọn ngẫu nhiên.
      `,
      example:
        "Khi kinh tế vận hành theo cơ chế thị trường, doanh nghiệp có động lực cạnh tranh và đổi mới; đồng thời Nhà nước định hướng để bảo đảm ổn định kinh tế vĩ mô và mục tiêu xã hội.",
      imagePrompt:
        "Academic visual showing objective necessity of socialist oriented market economy in Vietnam, growth, people welfare, market and state balance, infographic style.",
    },
    {
      id: "topic-3",
      shortTitle: "Đặc trưng",
      title: "Đặc trưng của nền kinh tế thị trường định hướng XHCN",
      subtitle: "Bao hàm đặc trưng của kinh tế thị trường nói chung và nét đặc thù của Việt Nam.",
      icon: <Layers className="w-6 h-6 text-accent" />,
      summary:
        "Nền kinh tế này có các đặc trưng tiêu biểu về mục tiêu phát triển, quan hệ sở hữu và thành phần kinh tế, quan hệ quản lý nền kinh tế, quan hệ phân phối và gắn tăng trưởng kinh tế với tiến bộ, công bằng xã hội.",
      highlights: [
        "Hướng tới phát triển lực lượng sản xuất.",
        "Nhiều hình thức sở hữu, thành phần kinh tế.",
        "Phát triển kinh tế đi đôi với tiến bộ xã hội.",
      ],
      content: `
**Nhóm đặc trưng chủ yếu**

- **Về mục tiêu:** Hướng tới phát triển lực lượng sản xuất, xây dựng cơ sở vật chất - kỹ thuật của chủ nghĩa xã hội, nâng cao đời sống nhân dân, thực hiện mục tiêu dân giàu, nước mạnh, dân chủ, công bằng, văn minh.
- **Về quan hệ sở hữu và thành phần kinh tế:** Có nhiều hình thức sở hữu, nhiều thành phần kinh tế; trong đó **kinh tế nhà nước giữ vai trò chủ đạo**, **kinh tế tư nhân là một động lực quan trọng**.
- **Về quan hệ quản lý nền kinh tế:** Nhà nước pháp quyền xã hội chủ nghĩa quản lý nền kinh tế dưới sự lãnh đạo của Đảng Cộng sản Việt Nam, có sự làm chủ và giám sát của nhân dân.
- **Về quan hệ phân phối:** Thực hiện nhiều hình thức phân phối, trong đó phân phối theo lao động và hiệu quả kinh tế là chủ yếu, đồng thời thông qua phúc lợi xã hội.
- **Về quan hệ giữa tăng trưởng kinh tế và công bằng xã hội:** Phát triển kinh tế đi đôi với tiến bộ và công bằng xã hội ngay trong từng bước, từng chính sách phát triển.
      `,
      example:
        "Trong thực tiễn Việt Nam, cùng với doanh nghiệp nhà nước còn có doanh nghiệp tư nhân, hợp tác xã, doanh nghiệp có vốn đầu tư nước ngoài; Nhà nước định hướng bằng chính sách, pháp luật và các chương trình an sinh.",
      imagePrompt:
        "Clean academic infographic summarizing characteristics of Vietnam socialist oriented market economy: goals, ownership, management, distribution, social justice, bright educational design.",
    },
  ]);

  const supplementItems: SupplementItem[] = [
    {
      id: "supp-1",
      title: "Mục tiêu của mô hình",
      teaser: "Phát triển lực lượng sản xuất và nâng cao đời sống nhân dân.",
      icon: <Target className="w-5 h-5" />,
      detail:
        "Mục tiêu của nền kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam không chỉ dừng ở tăng trưởng, mà còn nhằm xây dựng cơ sở vật chất - kỹ thuật của chủ nghĩa xã hội, cải thiện đời sống vật chất và tinh thần của nhân dân, đồng thời hướng tới mục tiêu dân giàu, nước mạnh, dân chủ, công bằng, văn minh.",
      bullets: [
        "Phát triển lực lượng sản xuất.",
        "Nâng cao đời sống nhân dân.",
        "Gắn tăng trưởng kinh tế với mục tiêu phát triển xã hội lâu dài.",
      ],
    },
    {
      id: "supp-2",
      title: "Cơ cấu sở hữu và thành phần kinh tế",
      teaser: "Nhiều hình thức sở hữu, nhiều thành phần kinh tế cùng phát triển.",
      icon: <Grid2X2 className="w-5 h-5" />,
      detail:
        "Đây là một đặc trưng quan trọng của mô hình ở Việt Nam. Nền kinh tế có nhiều hình thức sở hữu và nhiều thành phần kinh tế cùng tồn tại, cùng phát triển lâu dài; trong đó kinh tế nhà nước giữ vai trò chủ đạo, kinh tế tư nhân là một động lực quan trọng của nền kinh tế.",
      bullets: [
        "Kinh tế nhà nước giữ vai trò chủ đạo.",
        "Kinh tế tư nhân là động lực quan trọng.",
        "Các thành phần kinh tế bình đẳng trước pháp luật.",
      ],
    },
    {
      id: "supp-3",
      title: "Quan hệ phân phối và công bằng xã hội",
      teaser: "Nhiều hình thức phân phối, gắn tăng trưởng với tiến bộ xã hội.",
      icon: <Sparkles className="w-5 h-5" />,
      detail:
        "Trong nền kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam, phân phối không chỉ theo lao động mà còn theo hiệu quả kinh tế, mức đóng góp vốn và thông qua hệ thống phúc lợi xã hội. Điểm nhấn là phát triển kinh tế phải đi đôi với tiến bộ, công bằng xã hội trong từng bước, từng chính sách phát triển.",
      bullets: [
        "Phân phối theo lao động và hiệu quả kinh tế.",
        "Phân phối qua phúc lợi xã hội.",
        "Gắn tăng trưởng với tiến bộ, công bằng xã hội.",
      ],
    },
  ];

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const appendLocalMessage = (message: Message) => {
    setMessages((prev) => {
      const next = [...prev, message];
      if (user) saveLocalMessages(user.uid, next);
      return next;
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    const userMessage = inputValue.trim();
    const newMessage: Message = { role: "user", text: userMessage };

    setInputValue("");
    setIsLoading(true);
    appendLocalMessage(newMessage);

    const history = [...messages, newMessage].map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

    try {
      const response = await getChatResponse(userMessage, history);
      appendLocalMessage({ role: "model", text: response || "Xin lỗi, tôi không thể trả lời lúc này." });
    } catch (error) {
      appendLocalMessage({ role: "model", text: "Xin lỗi, đã có lỗi xảy ra khi xử lý câu hỏi của bạn." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImage = async (topicId: string) => {
    const topic = topics.find((item) => item.id === topicId);
    if (!topic || isGeneratingImage[topicId]) return;

    setIsGeneratingImage((prev) => ({ ...prev, [topicId]: true }));
    const url = await generateImage(topic.imagePrompt);
    if (url) {
      setTopics((prev) => prev.map((item) => (item.id === topicId ? { ...item, imageUrl: url } : item)));
    }
    setIsGeneratingImage((prev) => ({ ...prev, [topicId]: false }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-right" richColors />

      {/* Navigation */}
      <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <span className="text-xl font-serif font-bold">KTTT định hướng XHCN</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-6 mr-4 border-r pr-6">
              <a href="#overview" className="text-sm font-medium hover:text-primary transition-colors">Tổng quan</a>
              <a href="#topics" className="text-sm font-medium hover:text-primary transition-colors">Nội dung chính</a>
              <a href="#supplement" className="text-sm font-medium hover:text-primary transition-colors">Mở rộng</a>
              <a href="#flipbook" className="text-sm font-medium hover:text-primary transition-colors">Flipbook</a>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full w-9 h-9">
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost" }), "relative h-9 w-9 rounded-full p-0")}>
                    <Avatar className="h-9 w-9 border border-primary/10">
                      <AvatarImage src={profile?.photoURL || user.photoURL || ""} alt={profile?.displayName || ""} />
                      <AvatarFallback>{(profile?.displayName || user.displayName || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{profile?.displayName || user.displayName}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsProfileDialogOpen(true)}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Tùy chỉnh hồ sơ</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsChatOpen(true)}>
                      <History className="mr-2 h-4 w-4" />
                      <span>Lịch sử trò chuyện</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} variant="destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Đăng xuất</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="default" size="sm" onClick={handleLogin} className="rounded-full px-5 h-9">
                  <LogIn className="mr-2 h-4 w-4" /> Đăng nhập
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={() => setIsChatOpen(true)} className="rounded-full h-9">
                Hỏi Chatbot
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-x-hidden">
        {/* Hero Section với Hình 1 */}
        <section
          id="intro"
          className="relative pt-32 pb-24 overflow-hidden z-10 bg-fixed bg-center bg-cover"
          style={{ backgroundImage: 'url("/images/Section1.png")' }}
        >
          <div className="absolute inset-0 bg-black/40 dark:bg-background/60 backdrop-blur-[2px] -z-10" />
          <PhilosophicalParticles density={25} className="-z-10 opacity-50" />

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <Badge variant="outline" className="mb-8 px-4 py-1 border-white/40 text-white font-medium tracking-wider uppercase text-[10px] drop-shadow-sm">
                  Chương 5 - Nhóm 5
                </Badge>

                <h1 className="text-5xl md:text-7xl lg:text-8xl mb-8 leading-[0.9] tracking-tight font-serif not-italic text-white drop-shadow-lg">
                  Kinh tế thị trường <br className="hidden md:block" />
                  <span className="text-white not-italic">Định hướng XHCN</span>
                </h1>

                <p className="text-xl md:text-2xl text-white max-w-3xl mx-auto mb-12 font-sans font-medium leading-relaxed drop-shadow-xl">
                  Một bản web học tập tập trung đúng phạm vi phần Nhóm 5: khái niệm, tính tất yếu khách quan và đặc trưng của kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam.
                </p>

                <div className="max-w-4xl mx-auto mb-12 overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/10 dark:bg-zinc-900/50 shadow-2xl backdrop-blur-sm">
                  <img
                    src={FEATURE_IMAGES.overview}
                    alt="Tài liệu học tập chương 5"
                    className="h-[260px] md:h-[360px] w-full object-cover"
                  />
                </div>
                <div className="flex flex-wrap justify-center gap-6">
                  <a href="#topics" className={cn(buttonVariants({ size: "lg", variant: "default" }), "rounded-full px-10 h-14 text-base shadow-lg shadow-primary/20 flex items-center justify-center")}>
                    Xem nội dung chính <ArrowRight className="ml-2 w-5 h-5" />
                  </a>
                  <a href="#flipbook" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full px-10 h-14 text-base border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm")}>
                    Mở Flipbook
                  </a>
                  <Button size="lg" variant="outline" className="rounded-full px-10 h-14 text-base border-primary/20 hover:bg-primary/5" onClick={() => setIsChatOpen(true)}>
                    AI Triết Học
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Overview Section với Hình 2 */}
        <section
          id="overview"
          className="py-24 relative z-10 bg-center bg-cover"
          style={{ backgroundImage: 'url("/images/Section2.png")' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 to-white/70 dark:from-zinc-950/90 dark:to-zinc-950/80 backdrop-blur-md -z-10" />

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center max-w-5xl mx-auto">
              <div>
                <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-none rounded-full px-4">Tổng quan</Badge>
                <h2 className="text-4xl md:text-5xl font-serif italic mb-8">Khái niệm & Định hướng phát triển</h2>
                <div className="space-y-8">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-secondary/50 dark:bg-zinc-900 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">Khái niệm trọng tâm</h4>
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        Kinh tế thị trường định hướng xã hội chủ nghĩa là nền kinh tế vận hành theo các quy luật của thị trường, đồng thời hướng tới từng bước xác lập một xã hội dân giàu, nước mạnh, dân chủ, công bằng, văn minh; có sự điều tiết của Nhà nước do Đảng Cộng sản Việt Nam lãnh đạo.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                          <span className="text-[10px] font-mono uppercase text-primary block mb-1">Vận hành</span>
                          <p className="text-xs">Theo các quy luật của thị trường và các yếu tố cạnh tranh.</p>
                        </div>
                        <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                          <span className="text-[10px] font-mono uppercase text-primary block mb-1">Định hướng</span>
                          <p className="text-xs">Hướng tới mục tiêu xã hội chủ nghĩa phù hợp với Việt Nam.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-secondary/50 dark:bg-zinc-900 flex items-center justify-center">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">Tính tất yếu khách quan</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Việc phát triển mô hình này phù hợp với quy luật phát triển khách quan, phát huy ưu thế của kinh tế thị trường trong thúc đẩy phát triển và đồng thời phù hợp với nguyện vọng của nhân dân.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 bg-primary/5 rounded-[3rem] blur-2xl" />
                <div className="relative bg-secondary/20 dark:bg-zinc-900/50 border border-primary/5 p-10 rounded-[3rem] backdrop-blur-sm">
                  <h4 className="text-2xl font-serif italic mb-6">3 mảng kiến thức chính cần nắm</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {STRUCTURE_ITEMS.map((item, index) => (
                      <div key={item.id} className="flex flex-col p-4 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{index + 1}. {item.title}</span>
                          <Badge variant="secondary" className="rounded-full">{item.id === "khai-niem" ? "Cốt lõi" : "Trọng tâm"}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Topics Section (Dùng cấu trúc Tabs) với Hình 3 */}
        <section
          id="topics"
          className="py-32 relative z-10 bg-fixed bg-center bg-cover"
          style={{ backgroundImage: 'url("/images/Section3.png")' }}
        >
          <div className="absolute inset-0 bg-secondary/80 dark:bg-zinc-900/90 backdrop-blur-lg -z-10" />

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="text-center mb-20">
              <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-none rounded-full px-4">Nhóm 5</Badge>
              <h2 className="text-4xl md:text-5xl mb-6 font-serif italic">Nội dung trọng tâm</h2>
              <div className="w-20 h-1 bg-primary mx-auto mb-6 rounded-full" />
              <p className="text-muted-foreground dark:text-zinc-400 max-w-xl mx-auto text-lg font-light">
                Nội dung trọng tâm và chi tiết về từng phần.
              </p>
            </div>

            <Tabs defaultValue="topic-1" className="w-full max-w-5xl mx-auto">
              <TabsList className="flex flex-wrap md:grid w-full md:grid-cols-3 h-auto p-2 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-primary/10 rounded-2xl mb-12">
                {topics.map((topic) => (
                  <TabsTrigger
                    key={topic.id}
                    value={topic.id}
                    className="flex-1 py-4 text-muted-foreground data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-primary data-[state=active]:shadow-xl data-[state=active]:shadow-primary/5 rounded-xl transition-all duration-300"
                  >
                    <span className="text-sm md:text-base font-bold tracking-tight">{topic.shortTitle}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {topics.map((topic) => (
                <TabsContent key={topic.id} value={topic.id} className="mt-0">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid md:grid-cols-12 bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl shadow-primary/5 overflow-hidden border border-primary/5"
                  >
                    {/* Cột trái: Tiêu đề & Ảnh AI */}
                    <div className="md:col-span-5 bg-primary/[0.02] p-10 flex flex-col border-b md:border-b-0 md:border-r border-primary/5">
                      <div className="w-20 h-20 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-xl shadow-primary/5 mb-8 transform -rotate-3">
                        {topic.icon}
                      </div>
                      <h3 className="text-3xl mb-4 font-serif leading-tight">{topic.title}</h3>
                      <p className="text-base text-accent font-medium italic mb-10 opacity-80">{topic.subtitle}</p>

                      <div className="w-full mt-auto">
                        <div className="aspect-[4/3] w-full rounded-3xl bg-secondary/50 border border-dashed border-primary/20 flex flex-col items-center justify-center overflow-hidden relative group shadow-inner">
                          {topic.imageUrl ? (
                            <>
                              <img src={topic.imageUrl} alt={topic.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                <Button variant="secondary" className="rounded-full px-6 shadow-xl" onClick={() => handleGenerateImage(topic.id)} disabled={isGeneratingImage[topic.id]}>
                                  {isGeneratingImage[topic.id] ? "Đang tạo..." : "Tạo lại ảnh AI"}
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="p-8 flex flex-col items-center text-center">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Zap className="w-6 h-6 text-primary/40" />
                              </div>
                              <p className="text-xs text-muted-foreground mb-6 font-medium">Chưa có hình ảnh minh họa AI</p>
                              <Button variant="outline" className="rounded-full border-primary/20 hover:bg-primary/5" onClick={() => handleGenerateImage(topic.id)} disabled={isGeneratingImage[topic.id]}>
                                {isGeneratingImage[topic.id] ? "Đang tạo..." : "Tạo ảnh minh họa AI"}
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-4 italic text-center opacity-60">
                          * Hình ảnh được tạo ngẫu nhiên bởi AI dựa trên nội dung bài học
                        </p>
                      </div>
                    </div>

                    {/* Cột phải: Nội dung & Nút mở rộng */}
                    <div className="md:col-span-7 p-12 lg:p-16 flex flex-col justify-center">
                      <div className="rounded-[1.5rem] border border-primary/10 bg-secondary/20 dark:bg-zinc-900/70 p-5 mb-8">
                        <p className="text-sm font-semibold mb-2">Tóm tắt nhanh</p>
                        <p className="text-sm sm:text-base text-muted-foreground leading-7">{topic.summary}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 mb-4">
                        {topic.highlights.map((item, idx) => (
                          <div key={idx} className="rounded-2xl border border-primary/10 bg-primary/[0.03] px-4 py-3 text-sm leading-6">
                            {item}
                          </div>
                        ))}
                      </div>

                      {/* Phân vùng Nội dung chi tiết được giấu/hiện (Collapse/Expand) */}
                      <AnimatePresence initial={false}>
                        {expandedTopics[topic.id] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.35, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="prose prose-slate dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans text-lg mt-6 mb-8">
                              <ReactMarkdown>{topic.content}</ReactMarkdown>
                            </div>

                            <div className="p-8 bg-accent/5 dark:bg-accent/10 rounded-3xl border border-accent/10 relative overflow-hidden mb-6">
                              <div className="absolute top-0 right-0 p-4 opacity-10">
                                <BookOpen className="w-12 h-12 text-accent" />
                              </div>
                              <h4 className="text-accent font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-widest">
                                <span className="w-8 h-[1px] bg-accent/30" />
                                Ví dụ minh họa
                              </h4>
                              <p className="text-foreground/80 dark:text-zinc-300 italic font-serif text-xl leading-relaxed">
                                "{topic.example}"
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex justify-center mt-6">
                        <Button
                          variant={expandedTopics[topic.id] ? "outline" : "default"}
                          onClick={() => toggleExpandTopic(topic.id)}
                          className="rounded-full px-8 shadow-lg shadow-primary/20 transition-all duration-300"
                        >
                          {expandedTopics[topic.id] ? (
                            <>Thu gọn nội dung <ChevronDown className="ml-2 w-4 h-4 rotate-180 transition-transform" /></>
                          ) : (
                            <>Xem toàn bộ chi tiết <ChevronDown className="ml-2 w-4 h-4 transition-transform" /></>
                          )}
                        </Button>
                      </div>

                    </div>
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        {/* Supplement Section với Hình 4 */}
        <section
          id="supplement"
          className="py-32 relative z-10 bg-fixed bg-center bg-cover"
          style={{ backgroundImage: 'url("/images/Section4.png")' }}
        >
          <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md -z-10" />

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-serif italic mb-4 text-white">Mở rộng nội dung</h2>
                <p className="max-w-2xl mx-auto text-base md:text-lg leading-7 md:leading-8 text-white/70">
                  Chọn từng nội dung để xem nhanh các ý quan trọng về mục tiêu phát triển, cơ cấu sở hữu và quan hệ phân phối của mô hình kinh tế này.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 items-start">
                {supplementItems.map((item) => {
                  const isOpen = expandedSupplement === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      layout
                      onClick={() => setExpandedSupplement(isOpen ? null : item.id)}
                      className="text-left h-full rounded-[2rem] border border-white/20 bg-white/10 dark:bg-zinc-900/50 backdrop-blur-md p-6 shadow-2xl hover:bg-white/20 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
                            {item.icon}
                          </div>
                          <div>
                            <h3 className="text-2xl font-serif leading-tight mb-2 text-white">{item.title}</h3>
                            <p className="text-white/80 leading-7 text-sm">{item.teaser}</p>
                          </div>
                        </div>
                        <div className="mt-1 text-white shrink-0">
                          <ChevronDown className={cn("w-5 h-5 transition-transform", isOpen && "rotate-180")} />
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden text-white/90">
                            <Separator className="my-5 bg-white/20" />
                            <p className="leading-8 mb-4">{item.detail}</p>
                            <div className="grid gap-3">
                              {item.bullets.map((bullet, index) => (
                                <div key={index} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm leading-6">
                                  {bullet}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Flipbook Section */}
        {/* Flipbook Section */}
        <section
          id="intro"
          className="relative pt-32 pb-24 overflow-hidden z-10 bg-fixed bg-center bg-cover"
          style={{ backgroundImage: 'url("/images/Section5.png")' }}
        >
          {/* Lớp phủ mờ giúp dễ đọc chữ */}
          <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md -z-10" />

          <div className="container mx-auto px-4 md:px-6 relative z-10"></div>
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.10),transparent_40%)]" />
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-none rounded-full px-4">Flipbook tương tác</Badge>
                <h2 className="text-4xl md:text-5xl mb-6 font-serif italic">FlipBook - Bài học qua câu chuyện</h2>
                <p className="text-muted-foreground max-w-3xl mx-auto text-lg font-light leading-relaxed">
                  Một phiên bản kể chuyện trực quan giúp người học tiếp cận các khái niệm kinh tế khô khan bằng hình ảnh, nhịp đọc và trải nghiệm lật trang tự nhiên.
                </p>
              </div>

              <div className="rounded-[2rem] border border-primary/10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md shadow-2xl shadow-primary/5 p-4 md:p-8">
                <FlipBook />
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-20 border-t bg-white dark:bg-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom,var(--color-primary)_0%,transparent_70%)] opacity-[0.02]" />
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-serif font-bold tracking-tight">Chương 5 - MLN122</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-8 mb-12">
              <a href="#overview" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Tổng quan</a>
              <a href="#topics" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Nội dung chính</a>
              <a href="#supplement" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Mở rộng</a>
              <a href="#flipbook" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Flipbook</a>
              <button onClick={() => setIsChatOpen(true)} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Trợ lý AI</button>
            </nav>
            <Separator className="max-w-xs mx-auto mb-12 opacity-50" />
            <p className="text-sm text-muted-foreground font-light italic max-w-2xl">
              Nội dung trình bày tập trung đúng phạm vi Nhóm 5: khái niệm, tính tất yếu khách quan và đặc trưng của kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam.
            </p>
          </div>
        </div>
      </footer>

      {/* Chatbot Toggle Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 px-6 rounded-full shadow-[0_0_20px_rgba(230,81,0,0.5)] z-50 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white flex items-center gap-2 transition-all duration-300 hover:scale-105 animate-pulse"
        onClick={() => setIsChatOpen(true)}
      >
        <MessageSquare className="w-5 h-5" />
        <span className="font-bold text-sm tracking-wide">AI Triết học</span>
      </Button>

      {/* Chatbot Interface */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-6 right-6 w-[95vw] md:w-[600px] h-[80vh] max-h-[800px] z-50 flex flex-col bg-white dark:bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden border border-primary/5"
          >
            <div className="p-6 bg-gradient-to-br from-white to-orange-50 dark:from-zinc-950 dark:to-zinc-900 border-b border-orange-100/50 dark:border-orange-900/20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {user ? (
                    <Avatar className="w-12 h-12 rounded-2xl border-2 border-white shadow-lg shadow-orange-100 dark:shadow-none">
                      <AvatarImage src={profile?.photoURL || user.photoURL || ""} />
                      <AvatarFallback className="bg-orange-100 text-orange-600">
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <div>
                  <p className="font-serif font-bold text-lg leading-none mb-1 text-zinc-900 dark:text-zinc-100">
                    Triết Học AI
                  </p>
                  {user && (
                    <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">
                      Chào, {profile?.displayName || user.displayName?.split(' ')[0]}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400 transition-colors" onClick={() => setIsChatOpen(false)}>
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-secondary/[0.02] custom-scrollbar">
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm leading-relaxed ${msg.role === "user"
                      ? "bg-primary text-white dark:text-zinc-950 rounded-tr-none shadow-lg shadow-primary/20"
                      : "bg-white dark:bg-card text-foreground rounded-tl-none shadow-sm border border-primary/5"
                      }`}>
                      <div className={cn("prose prose-sm max-w-none", msg.role === "user" ? "prose-invert" : "prose-slate dark:prose-invert")}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-card p-4 rounded-[1.5rem] rounded-tl-none shadow-sm border border-primary/5 flex gap-1.5">
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-primary/40 rounded-full" />
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-primary/40 rounded-full" />
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-primary/40 rounded-full" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-950 border-t border-primary/5">
              <form
                className="flex gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <Input
                  placeholder="Nhập câu hỏi cho chatbot"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 h-12 rounded-full px-6 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20 focus-visible:border-primary/20 transition-all"
                />
                <Button type="submit" size="icon" className="w-12 h-12 rounded-full shadow-lg shadow-primary/20" disabled={isLoading || !inputValue.trim()}>
                  <Send className="w-5 h-5" />
                </Button>
              </form>
              <p className="text-[10px] text-center text-muted-foreground mt-4 font-medium tracking-wide opacity-60">
                Sử dụng trí tuệ nhân tạo để hỗ trợ học tập
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogs Profiling & Auth (Giữ nguyên) */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Tùy chỉnh hồ sơ</DialogTitle>
            <DialogDescription>
              Thay đổi tên hiển thị và ảnh đại diện của bạn.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex justify-center">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-primary/10">
                  <AvatarImage src={newPhotoURL || profile?.photoURL || user?.photoURL || ""} />
                  <AvatarFallback className="text-2xl">{(newDisplayName || user?.displayName || "U").charAt(0)}</AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewPhotoURL(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium px-1">Tên hiển thị</label>
              <Input
                id="name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Nhập tên của bạn..."
                className="rounded-full h-12 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="photo" className="text-sm font-medium px-1">URL Ảnh đại diện</label>
              <Input
                id="photo"
                value={newPhotoURL}
                onChange={(e) => setNewPhotoURL(e.target.value)}
                placeholder="https://..."
                className="rounded-full h-12 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)} className="rounded-full">Hủy</Button>
            <Button onClick={handleUpdateProfile} className="rounded-full px-8" disabled={isUpdatingProfile}>
              {isUpdatingProfile ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAuthDialogOpen} onOpenChange={(open) => { setIsAuthDialogOpen(open); if (!open) resetAuthForm(); }}>
        <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary p-8 text-white text-center">
            <h2 className="text-3xl font-serif italic mb-2">
              {authMode === "login" ? "Chào mừng trở lại" : "Tham gia cùng chúng tôi"}
            </h2>
            <p className="text-primary-foreground/80 text-sm">
              {authMode === "login" ? "Đăng nhập để tiếp tục hành trình học tập" : "Tạo tài khoản để lưu trữ lịch sử trò chuyện"}
            </p>
          </div>

          <div className="p-8 bg-white dark:bg-zinc-950">
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {authMode === "register" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Họ và tên</label>
                  <Input
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="rounded-xl h-12 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="rounded-xl h-12 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Mật khẩu</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl h-12 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20"
                  required
                />
              </div>

              {authMode === "register" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Xác nhận mật khẩu</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-xl h-12 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20"
                    required
                  />
                </div>
              )}

              {authError && (
                <p className="text-destructive text-xs font-medium bg-destructive/10 p-3 rounded-xl">
                  {authError}
                </p>
              )}

              <Button type="submit" disabled={isAuthSubmitting} className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20">
                {isAuthSubmitting ? "Đang xử lý..." : authMode === "login" ? "Đăng nhập" : "Đăng ký"}
              </Button>
              {authMode === "login" && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full text-right text-xs font-medium text-primary hover:underline"
                >
                  Quên mật khẩu?
                </button>
              )}
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-secondary dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-950 px-4 text-muted-foreground font-bold tracking-widest">Hoặc</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={isAuthSubmitting}
              className="w-full h-12 rounded-xl border-secondary dark:border-zinc-800 hover:bg-secondary/10 flex items-center justify-center gap-3 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Tiếp tục với Google
            </Button>

            <p className="text-center mt-8 text-sm text-muted-foreground">
              {authMode === "login" ? (
                <>
                  Chưa có tài khoản?{" "}
                  <button
                    onClick={() => { setAuthMode("register"); setAuthError(""); }}
                    className="text-primary font-bold hover:underline"
                  >
                    Đăng ký ngay
                  </button>
                </>
              ) : (
                <>
                  Đã có tài khoản?{" "}
                  <button
                    onClick={() => { setAuthMode("login"); setAuthError(""); }}
                    className="text-primary font-bold hover:underline"
                  >
                    Đăng nhập
                  </button>
                </>
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}