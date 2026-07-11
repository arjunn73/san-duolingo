import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProgress } from '../lib/auth';
import type { Unit, Lesson } from '../lib/supabase';
import {
  Circle, Star, Trophy, Lock, CheckCircle2,
  Play, PenTool, Scroll
} from 'lucide-react';

export function LearningPathScreen({
  onStartLesson,
}: {
  onStartLesson: (lessonId: string) => void;
}) {
  const { progress, completions, loadingProgress } = useProgress();
  const [units, setUnits] = useState<Unit[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function fetchData() {
      const [unitsRes, lessonsRes] = await Promise.all([
        supabase.from('units').select('*').order('order_index'),
        supabase.from('lessons').select('*').order('order_index'),
      ]);
      setUnits(unitsRes.data ?? []);
      setLessons(lessonsRes.data ?? []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const getLessonStatus = (lesson: Lesson, allLessons: Lesson[], completed: string[]) => {
    if (completed.includes(lesson.id)) return 'completed';
    const lessonIndex = allLessons.findIndex((l) => l.id === lesson.id);
    if (lessonIndex === 0) return 'available';
    const prevLesson = allLessons[lessonIndex - 1];
    if (completed.includes(prevLesson.id)) return 'available';
    return 'locked';
  };

  const getFirstAvailableLessonId = () => {
    for (const unit of units) {
      const unitLessons = lessons.filter((l) => l.unit_id === unit.id);
      for (const lesson of unitLessons) {
        if (getLessonStatus(lesson, lessons, completions) !== 'locked') {
          return lesson.id;
        }
      }
    }
    return null;
  };

  const firstAvailable = getFirstAvailableLessonId();

  if (loading || loadingProgress) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-saffron-200 border-t-saffron-500 animate-spin mx-auto mb-4" />
          <p className="text-saffron-600 font-medium">Loading your path...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-cream/90 backdrop-blur-md border-b border-saffron-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center">
              <span className="font-devanagari text-lg font-bold text-white">सं</span>
            </div>
            <span className="font-bold text-saffron-900 text-lg">Sanskrit Path</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-saffron-50 px-3 py-1.5 rounded-full">
              <span className="text-base">🔥</span>
              <span className="font-bold text-saffron-700 text-sm">{progress?.current_streak ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gold-100 px-3 py-1.5 rounded-full">
              <Star className="w-3.5 h-3.5 text-gold-600 fill-gold-500" />
              <span className="font-bold text-gold-700 text-sm">{progress?.total_xp ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-maroon-50 px-3 py-1.5 rounded-full">
              <span className="text-sm">❤️</span>
              <span className="font-bold text-maroon-600 text-sm">{progress?.hearts ?? 5}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Banner */}
      {firstAvailable && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <button
            onClick={() => onStartLesson(firstAvailable)}
            className="w-full bg-gradient-to-r from-saffron-500 to-saffron-600 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg shadow-saffron-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <div className="text-left">
              <p className="text-xs font-semibold text-saffron-100 uppercase tracking-wide">
                {completions.length > 0 ? 'Continue Learning' : 'Start Here'}
              </p>
              <p className="font-bold text-base mt-0.5">
                {(() => {
                  const lesson = lessons.find((l) => l.id === firstAvailable);
                  return lesson?.title ?? 'Begin';
                })()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Play className="w-5 h-5 fill-white" />
            </div>
          </button>
        </div>
      )}

      {/* Units and Lessons */}
      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        {units.map((unit) => {
          const unitLessons = lessons.filter((l) => l.unit_id === unit.id);
          const completedCount = unitLessons.filter((l) => completions.includes(l.id)).length;
          const unitProgress = Math.round((completedCount / unitLessons.length) * 100);
          const isMaroon = unit.color_theme === 'maroon';

          return (
            <div key={unit.id}>
              {/* Unit Banner */}
              <div
                className={`rounded-3xl p-5 mb-4 ${
                  isMaroon
                    ? 'bg-gradient-to-br from-maroon-700 to-maroon-900'
                    : 'bg-gradient-to-br from-saffron-500 to-saffron-700'
                } shadow-lg`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {unit.icon_name === 'PenTool' && <PenTool className="w-4 h-4 text-white/80" />}
                      {unit.icon_name === 'Scroll' && <Scroll className="w-4 h-4 text-white/80" />}
                      <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
                        Unit {unit.order_index}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white">{unit.title}</h2>
                    <p className="text-sm text-white/80 mt-0.5">{unit.description}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-2xl font-extrabold text-white">{unitProgress}%</div>
                    <div className="text-xs text-white/60">{completedCount}/{unitLessons.length}</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/80 rounded-full transition-all duration-500"
                    style={{ width: `${unitProgress}%` }}
                  />
                </div>
              </div>

              {/* Lesson Path */}
              <div className="relative">
                {/* Curved path SVG */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                >
                  {unitLessons.map((_, idx) => {
                    if (idx === unitLessons.length - 1) return null;
                    const offset = idx % 4;
                    const x1 = [50, 70, 50, 30][offset];
                    const y1 = (idx / unitLessons.length) * 100;
                    const y2 = ((idx + 1) / unitLessons.length) * 100;
                    const x2 = [70, 50, 30, 50][(idx + 1) % 4 - 1] ?? 50;
                    return (
                      <path
                        key={idx}
                        d={`M ${x1} ${y1} Q ${x1} ${(y1 + y2) / 2} ${x2} ${y2}`}
                        stroke={isMaroon ? '#f9cccc' : '#ffd99b'}
                        strokeWidth="0.8"
                        fill="none"
                        className="path-connector"
                        opacity="0.5"
                      />
                    );
                  })}
                </svg>

                <div className="relative space-y-6 py-2">
                  {unitLessons.map((lesson, idx) => {
                    const status = getLessonStatus(lesson, lessons, completions);
                    const offset = idx % 4;
                    const marginLeft = ['0%', '20%', '0%', '-20%'][offset];

                    return (
                      <div
                        key={lesson.id}
                        className="flex flex-col items-center transition-all"
                        style={{ marginLeft }}
                      >
                        <LessonNode
                          lesson={lesson}
                          status={status}
                          isCurrent={lesson.id === firstAvailable}
                          isMaroon={isMaroon}
                          onClick={() => status !== 'locked' && onStartLesson(lesson.id)}
                        />
                        <div className="mt-2 text-center">
                          <p className={`text-sm font-semibold ${
                            status === 'completed' ? 'text-success-600' :
                            status === 'available' ? (isMaroon ? 'text-maroon-700' : 'text-saffron-700') :
                            'text-saffron-300'
                          }`}>
                            {lesson.title}
                          </p>
                          <p className="text-xs text-saffron-400 mt-0.5 max-w-[200px]">{lesson.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LessonNode({
  lesson,
  status,
  isCurrent,
  isMaroon,
  onClick,
}: {
  lesson: Lesson;
  status: 'completed' | 'available' | 'locked';
  isCurrent: boolean;
  isMaroon: boolean;
  onClick: () => void;
}) {
  if (status === 'locked') {
    return (
      <button
        disabled
        className="w-16 h-16 rounded-full bg-saffron-100 flex items-center justify-center shadow-sm"
      >
        <Lock className="w-6 h-6 text-saffron-300" />
      </button>
    );
  }

  if (lesson.icon_name === 'Trophy') {
    return (
      <button
        onClick={onClick}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center shadow-lg shadow-gold-400/30 hover:scale-110 active:scale-95 transition-all"
      >
        <Trophy className="w-7 h-7 text-white fill-white/30" />
      </button>
    );
  }

  const gradientClass = isMaroon
    ? 'bg-gradient-to-br from-maroon-400 to-maroon-600 shadow-maroon-400/30'
    : 'bg-gradient-to-br from-saffron-400 to-saffron-600 shadow-saffron-400/30';

  return (
    <button
      onClick={onClick}
      className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 ${gradientClass} ${
        isCurrent ? 'animate-pulse-ring' : ''
      }`}
    >
      {status === 'completed' ? (
        <CheckCircle2 className="w-8 h-8 text-white" />
      ) : (
        <Circle className="w-8 h-8 text-white fill-white/20" />
      )}
      {isCurrent && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold text-saffron-700 bg-white px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
          Start
        </span>
      )}
    </button>
  );
}
