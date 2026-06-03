import { PostList } from '@/components/blog/PostList'

export function Blog() {
  return (
    <div>
      <h1 className="text-2xl text-[#3a3a38] mb-6 font-light tracking-wide">博客</h1>
      <PostList postType="blog" />
    </div>
  )
}
