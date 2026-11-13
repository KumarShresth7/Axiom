"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        const payload = isLogin 
            ? { email, password } 
            : { email, username, password };

        try {
            const response = await fetch(`http://localhost:8080${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(isLogin ? "Invalid credentials." : "Email or username already taken.");
            }

            const data = await response.json();
            localStorage.setItem("axiom_token", data.token);
            router.push("/lobby");
        } catch (err: any) {
            setError(err.message || "An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError("");
        setPassword("");
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono selection:bg-purple-500/30">
            <div className="w-full max-w-md p-8 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl shadow-2xl relative overflow-hidden">
                {/* Subtle top gradient accent */}
                <div className={`absolute top-0 left-0 w-full h-1 ${isLogin ? 'bg-purple-600' : 'bg-yellow-500'} transition-colors duration-500`} />

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                        Axiom <span className={`w-2 h-2 rounded-full ${isLogin ? 'bg-purple-500' : 'bg-yellow-500'} animate-pulse`} />
                    </h1>
                    <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest">
                        {isLogin ? "Session Initialization" : "Identity Establishment"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-gray-500 text-xs uppercase tracking-wider mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full bg-[#121212] border border-[#222] text-gray-200 px-4 py-2.5 rounded focus:outline-none focus:border-${isLogin ? 'purple' : 'yellow'}-500 focus:ring-1 focus:ring-${isLogin ? 'purple' : 'yellow'}-500/50 transition-all`}
                            required
                        />
                    </div>

                    {/* Username field smoothly reveals only during registration */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isLogin ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'}`}>
                        <label className="block text-gray-500 text-xs uppercase tracking-wider mb-1.5">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-[#121212] border border-[#222] text-gray-200 px-4 py-2.5 rounded focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                            required={!isLogin}
                        />
                    </div>

                    <div>
                        <label className="block text-gray-500 text-xs uppercase tracking-wider mb-1.5">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full bg-[#121212] border border-[#222] text-gray-200 px-4 py-2.5 rounded focus:outline-none focus:border-${isLogin ? 'purple' : 'yellow'}-500 focus:ring-1 focus:ring-${isLogin ? 'purple' : 'yellow'}-500/50 transition-all`}
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full text-black font-bold py-3 px-4 rounded mt-4 transition-all duration-300 disabled:opacity-50 
                            ${isLogin 
                                ? 'bg-white hover:bg-purple-100 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                                : 'bg-white hover:bg-yellow-100 hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]'}`}
                    >
                        {isLoading ? "PROCESSING..." : (isLogin ? "AUTHENTICATE" : "REGISTER")}
                    </button>
                </form>

                <div className="mt-6 text-center border-t border-[#1a1a1a] pt-4">
                    <button 
                        type="button"
                        onClick={toggleMode}
                        className="text-gray-500 text-xs hover:text-white transition-colors"
                    >
                        {isLogin ? "Need an arena pass? Create identity." : "Already registered? Authenticate."}
                    </button>
                </div>
            </div>
        </div>
    );
}